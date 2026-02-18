import { MATERIALS } from "@/lib/materials";
import { normalizeSliders, normalizeWeights } from "@/lib/normalize";
import { cosineSimilarity, weightedCloseness } from "@/lib/engine/score";
import { predictBlend } from "@/lib/engine/predict";
import type {
  Candidate,
  CompositionPart,
  GenerateConstraints,
  Material,
  MetricKey,
  SessionInput
} from "@/lib/types";
import { PERFORMANCE_METRICS, SUSTAINABILITY_METRICS } from "@/lib/types";
import { getUseCaseById, resolveUseCaseId } from "@/lib/use-cases";
import type { EolConstraint, UseCaseConfig } from "@/lib/types/useCase";

const MAX_MICROPLASTIC_ORDER: Record<"low" | "medium" | "high", number> = {
  low: 1,
  medium: 2,
  high: 3
};

function clampCostToScore(eurKg: number): number {
  const max = 25;
  const min = 1;
  const normalized = (Math.min(max, Math.max(min, eurKg)) - min) / (max - min);
  return Number((100 - normalized * 100).toFixed(1));
}

function filterMaterials(constraints: GenerateConstraints | undefined, materials: Material[]): Material[] {
  return materials.filter((m) => {
    if (constraints?.must_biodegradable && m.constraints.biodegradability_class === "low") return false;
    if (constraints?.no_animal_fibers && m.constraints.animal_fiber) return false;
    if (
      constraints?.max_microplastic_risk &&
      MAX_MICROPLASTIC_ORDER[m.constraints.microplastic_risk] > MAX_MICROPLASTIC_ORDER[constraints.max_microplastic_risk]
    ) {
      return false;
    }
    if (typeof constraints?.max_cost === "number" && m.cost_min > constraints.max_cost) return false;
    return true;
  });
}

function categoryFamily(category: Material["category"]): string {
  if (category === "MMCF") return "CELLULOSIC";
  if (category === "Bast") return "BAST";
  if (category === "Natural") return "NATURAL";
  if (category === "Synthetic") return "SYNTHETIC";
  if (category === "BioPolymer") return "BIOPOLYMER";
  return "PROTEIN";
}

function mergeConstraints(input: GenerateConstraints | undefined, useCaseConstraints: EolConstraint | undefined): GenerateConstraints {
  const merged: GenerateConstraints = { ...(input ?? {}) };
  const risk = useCaseConstraints?.max_microplastic_risk;
  if (typeof risk === "number") {
    const mapped: GenerateConstraints["max_microplastic_risk"] = risk <= 4 ? "low" : risk <= 7 ? "medium" : "high";
    const existing = merged.max_microplastic_risk;
    if (!existing || MAX_MICROPLASTIC_ORDER[mapped] < MAX_MICROPLASTIC_ORDER[existing]) {
      merged.max_microplastic_risk = mapped;
    }
  }
  return merged;
}

function adjustWeightsForUseCase(baseWeights: Record<MetricKey, number>, useCase: UseCaseConfig): Record<MetricKey, number> {
  const out = { ...baseWeights };
  for (const [metric, bias] of Object.entries(useCase.property_bias)) {
    const key = metric as keyof UseCaseConfig["property_bias"] & MetricKey;
    out[key] = out[key] * (1 + Math.max(0, Math.min(1.5, Number(bias ?? 0))));
  }
  const sum = Object.values(out).reduce((a, b) => a + b, 0);
  if (sum <= 0) return baseWeights;
  for (const key of Object.keys(out) as MetricKey[]) out[key] = out[key] / sum;
  return out;
}

function candidateUseCaseObjective(candidate: Candidate, useCase: UseCaseConfig): number {
  const perf = avg(PERFORMANCE_METRICS.map((k) => candidate.predicted_properties[k] ?? 50)) / 100;
  const sust = avg(SUSTAINABILITY_METRICS.map((k) => candidate.predicted_properties[k] ?? 50)) / 100;
  const circ = candidate.circularity.circularity_score / 10;
  const cost = (candidate.predicted_properties.cost ?? 50) / 100;
  const feasibility =
    (avg([candidate.predicted_properties.scalability ?? 50, candidate.predicted_properties.cost ?? 50]) * 0.6 +
      (candidate.feasibility.trl_est / 9) * 100 * 0.4) /
    100;

  return (
    useCase.score_weights.performance * perf +
    useCase.score_weights.sustainability * sust +
    useCase.score_weights.circularity * circ +
    useCase.score_weights.cost * cost +
    useCase.score_weights.feasibility * feasibility
  );
}

function applyUseCasePenaltiesAndBonuses(candidate: Candidate, useCase: UseCaseConfig, materialById: Map<string, Material>): number {
  let delta = 0;
  const constraints = useCase.constraints;
  const composition = candidate.composition;
  const components = composition.filter((p) => p.pct > 0).length;
  const hasAnyElastomer = composition.some((p) => hasElastomer(p.name));

  if (constraints?.no_elastane && hasAnyElastomer) delta -= 0.12;
  if (constraints?.prefer_monomaterial && components > 2) delta -= 0.05;
  if (typeof constraints?.must_be_recyclable_min === "number") {
    const gap = constraints.must_be_recyclable_min - candidate.circularity.recyclability_score;
    if (gap > 0) delta -= gap * 0.03;
  }
  if (typeof constraints?.max_microplastic_risk === "number") {
    const gap = candidate.circularity.microplastic_risk - constraints.max_microplastic_risk;
    if (gap > 0) delta -= gap * 0.03;
  }

  const preferred = new Set((useCase.material_preferences?.preferred_families ?? []).map((v) => v.toUpperCase()));
  const discouraged = new Set((useCase.material_preferences?.discouraged_families ?? []).map((v) => v.toUpperCase()));
  let preferredShare = 0;
  let discouragedShare = 0;

  for (const part of composition) {
    const m = materialById.get(part.material_id);
    if (!m) continue;
    const family = categoryFamily(m.category);
    if (preferred.has(family)) preferredShare += part.pct;
    if (discouraged.has(family)) discouragedShare += part.pct;
  }

  delta += (preferredShare / 100) * 0.09;
  delta -= (discouragedShare / 100) * 0.1;

  if (components <= 2) delta += (useCase.bonuses?.monomaterial_bonus ?? 0) / 100;
  if (candidate.circularity.microplastic_risk <= 4) delta += (useCase.bonuses?.low_microplastic_bonus ?? 0) / 100;

  return delta;
}

function mulberry32(seed: number): () => number {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashInput(input: SessionInput): number {
  const text = JSON.stringify(input);
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 42;
}

function roundComposition(parts: CompositionPart[]): CompositionPart[] {
  const rounded = parts.map((p) => ({ ...p, pct: Math.round(p.pct) }));
  const total = rounded.reduce((acc, p) => acc + p.pct, 0);
  const delta = 100 - total;
  rounded[0].pct += delta;
  return rounded;
}

function makeComposition(base: Material, secondary: Material, additive: Material, rand: () => number): CompositionPart[] {
  const b = 50 + Math.floor(rand() * 21); // 50-70
  const sMax = Math.min(40, 95 - b); // keep at least 5% for additive
  const sMin = Math.min(20, sMax);
  const s = sMin + Math.floor(rand() * (sMax - sMin + 1));
  const a = 100 - b - s;

  return roundComposition([
    { material_id: base.id, name: base.name, pct: b },
    { material_id: secondary.id, name: secondary.name, pct: s },
    { material_id: additive.id, name: additive.name, pct: a }
  ]);
}

function buildExplanation(candidate: Candidate): Pick<Candidate, "explanation" | "manufacturing_notes" | "risks"> {
  const compositionText = candidate.composition.map((c) => `${c.pct}% ${c.name}`).join(" + ");
  return {
    explanation: `Blend ${compositionText}. Balanced toward durability ${candidate.predicted_properties.durability.toFixed(0)} and breathability ${candidate.predicted_properties.breathability.toFixed(0)} with estimated TRL ${candidate.feasibility.trl_est.toFixed(1)}.`,
    manufacturing_notes: [
      "Recommended yarn trial with medium twist before knitting/weaving selection.",
      "Run wash-cycle test for handfeel stabilization and dimensional stability.",
      "Validate finishing chemistry compatibility with primary cellulosic fraction."
    ],
    risks: [
      `Supply risk flagged as ${candidate.feasibility.supply_risk}.`,
      "Pilot-lot variability possible on additive component.",
      "Confirm conversion yield at industrial scale before procurement."
    ]
  };
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function to10(score0to100: number): number {
  return Number((Math.max(0, Math.min(100, score0to100)) / 10).toFixed(1));
}

function computeCompositeScores(candidate: Candidate): Candidate["scores"] {
  const perf = avg(PERFORMANCE_METRICS.map((k) => candidate.predicted_properties[k] ?? 50));
  const sust = avg(SUSTAINABILITY_METRICS.map((k) => candidate.predicted_properties[k] ?? 50));
  const feasibilityRaw =
    avg([candidate.predicted_properties.scalability ?? 50, candidate.predicted_properties.cost ?? 50]) * 0.6 +
    (candidate.feasibility.trl_est / 9) * 100 * 0.4;
  const overall = perf * 0.45 + sust * 0.35 + feasibilityRaw * 0.2;

  return {
    performance_0_10: to10(perf),
    sustainability_0_10: to10(sust),
    feasibility_0_10: to10(feasibilityRaw),
    overall_0_100: Number(overall.toFixed(1))
  };
}

function hasElastomer(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("elastane") || n.includes("spandex") || n.includes("lycra") || n.includes("tpu");
}

function evaluateCircularity(
  composition: CompositionPart[],
  materialById: Map<string, Material>,
  predicted: Record<MetricKey, number>
): Candidate["circularity"] {
  let syntheticShare = 0;
  let elastomerShare = 0;
  let microRiskWeighted = 0;
  const notes: string[] = [];

  for (const part of composition) {
    const m = materialById.get(part.material_id);
    if (!m) continue;
    const isSynthetic = m.category === "Synthetic" || m.category === "BioPolymer";
    if (isSynthetic) syntheticShare += part.pct;
    if (hasElastomer(m.name)) elastomerShare += part.pct;

    const mapped = m.constraints.microplastic_risk === "low" ? 2 : m.constraints.microplastic_risk === "medium" ? 5 : 9;
    microRiskWeighted += (mapped * part.pct) / 100;
  }

  const components = composition.filter((x) => x.pct > 0).length;
  const separation_difficulty = Math.max(0, Math.min(10, Number((components * 2 + syntheticShare * 0.05 + elastomerShare * 0.12).toFixed(1))));
  let recyclability_score = Number(((predicted.recyclability ?? 50) / 10).toFixed(1));
  const microplastic_risk = Math.max(0, Math.min(10, Number(microRiskWeighted.toFixed(1))));

  if (elastomerShare >= 8) {
    recyclability_score = Math.max(0, Number((recyclability_score - 2.5).toFixed(1)));
    notes.push("Elastomer fraction significantly reduces recyclable pathways.");
  } else if (elastomerShare > 0) {
    recyclability_score = Math.max(0, Number((recyclability_score - 1.2).toFixed(1)));
    notes.push("Small elastomer fraction introduces separation complexity.");
  }

  if (components >= 3) {
    notes.push("Multi-material blend may require advanced sorting/separation.");
  }

  const biodeg = predicted.biodegradability ?? 50;
  let eol_pathway: Candidate["circularity"]["eol_pathway"] = "UNKNOWN";
  if (biodeg >= 75 && syntheticShare < 25 && microplastic_risk <= 4) {
    eol_pathway = "INDUSTRIAL_COMPOST";
  } else if (recyclability_score >= 7 && separation_difficulty <= 5) {
    eol_pathway = "MECHANICAL_RECYCLING";
  } else if (recyclability_score >= 6 && syntheticShare >= 50) {
    eol_pathway = "CHEMICAL_RECYCLING";
  } else if (elastomerShare > 0 || separation_difficulty >= 7.5) {
    eol_pathway = "LANDFILL_RISK";
  }

  const circularity_score = Math.max(
    0,
    Math.min(
      10,
      Number((recyclability_score * 0.5 + (10 - separation_difficulty) * 0.3 + (10 - microplastic_risk) * 0.2).toFixed(1))
    )
  );

  if (!notes.length) {
    notes.push("Blend has viable circular pathways with moderate processing requirements.");
  }

  return {
    recyclability_score,
    separation_difficulty,
    microplastic_risk,
    eol_pathway,
    circularity_score,
    notes
  };
}

export function rerankByObjective(candidates: Candidate[], objective: "min_co2" | "min_cost" | "max_durability"): Candidate[] {
  const scored = [...candidates].map((candidate) => {
    let bonus = 0;
    if (objective === "min_co2") {
      bonus = (100 - candidate.predicted_lca.co2_kg_per_kg * 10) / 100;
    } else if (objective === "min_cost") {
      bonus = candidate.predicted_properties.cost / 100;
    } else {
      bonus = candidate.predicted_properties.durability / 100;
    }

    return { ...candidate, score: Number((candidate.score * 0.8 + bonus * 0.2).toFixed(4)) };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .map((candidate, idx) => ({ ...candidate, rank: idx + 1 }));
}

export function findSimilarMaterials(targetMaterialId: string, limit = 5): Material[] {
  const source = MATERIALS.find((m) => m.id === targetMaterialId);
  if (!source) return [];

  return MATERIALS.filter((m) => m.id !== source.id)
    .map((m) => ({ item: m, sim: cosineSimilarity(source.properties, m.properties) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, limit)
    .map((x) => x.item);
}

export function findSimilarMaterialsFromCatalog(catalog: Material[], targetMaterialId: string, limit = 5): Material[] {
  const source = catalog.find((m) => m.id === targetMaterialId);
  if (!source) return [];

  return catalog
    .filter((m) => m.id !== source.id)
    .map((m) => ({ item: m, sim: cosineSimilarity(source.properties, m.properties) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, limit)
    .map((x) => x.item);
}

export function generateCandidates(input: SessionInput, materials: Material[] = MATERIALS): Candidate[] {
  const useCaseId = resolveUseCaseId(input);
  const useCase = getUseCaseById(useCaseId);
  const target = normalizeSliders(input.sliders);
  const weights = adjustWeightsForUseCase(normalizeWeights(input.weights), useCase);
  const mergedConstraints = mergeConstraints(input.constraints, useCase.constraints);
  const filtered = filterMaterials(mergedConstraints, materials);
  if (filtered.length < 3) {
    throw new Error("Not enough materials after applying constraints");
  }

  const seed = hashInput(input);
  const rand = mulberry32(seed);
  const materialById = new Map(filtered.map((m) => [m.id, m]));

  const top = filtered
    .map((m) => ({ material: m, sim: cosineSimilarity(target, m.properties) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, Math.max(8, Math.min(14, filtered.length)));

  const out: Candidate[] = [];

  for (let i = 0; i < 6; i += 1) {
    const base = top[i % top.length].material;
    const secondary = top[(i + 2) % top.length].material;
    const additivePool = filtered.filter(
      (m) =>
        (m.category === "BioPolymer" || m.category === "Synthetic" || m.category === "MMCF") &&
        !(useCase.constraints?.no_elastane && hasElastomer(m.name))
    );
    const additive = additivePool[Math.floor(rand() * additivePool.length)] ?? top[(i + 3) % top.length].material;

    const composition = makeComposition(base, secondary, additive, rand);
    const { predicted_properties, predicted_lca, feasibility } = predictBlend(composition, materialById);

    const avgCost = composition.reduce((sum, part) => {
      const mat = materialById.get(part.material_id);
      if (!mat) return sum;
      return sum + (((mat.cost_min + mat.cost_max) / 2) * part.pct) / 100;
    }, 0);
    predicted_properties.cost = clampCostToScore(avgCost) as Record<MetricKey, number>["cost"];
    predicted_properties.scalability = Number((feasibility.trl_est * 11.11).toFixed(1)) as Record<MetricKey, number>["scalability"];
    const circularity = evaluateCircularity(composition, materialById, predicted_properties);

    let score = weightedCloseness(predicted_properties, target, weights);
    const useCaseObjective = candidateUseCaseObjective(
      {
        rank: i + 1,
        score,
        scores: { performance_0_10: 0, sustainability_0_10: 0, feasibility_0_10: 0, overall_0_100: 0 },
        composition,
        predicted_properties,
        predicted_lca,
        feasibility,
        circularity,
        explanation: "",
        manufacturing_notes: [],
        risks: []
      },
      useCase
    );
    score = score * 0.55 + useCaseObjective * 0.45;
    if (feasibility.supply_risk === "high") score -= 0.08;
    if (feasibility.trl_est < 6) score -= 0.05;
    score -= (10 - circularity.circularity_score) * 0.012;
    if (circularity.eol_pathway === "LANDFILL_RISK") score -= 0.06;
    const candidateBase: Candidate = {
      rank: i + 1,
      score: Number((score + applyUseCasePenaltiesAndBonuses(
        {
          rank: i + 1,
          score,
          scores: { performance_0_10: 0, sustainability_0_10: 0, feasibility_0_10: 0, overall_0_100: 0 },
          composition,
          predicted_properties,
          predicted_lca,
          feasibility,
          circularity,
          explanation: "",
          manufacturing_notes: [],
          risks: []
        },
        useCase,
        materialById
      )).toFixed(4)),
      scores: {
        performance_0_10: 0,
        sustainability_0_10: 0,
        feasibility_0_10: 0,
        overall_0_100: 0
      },
      composition,
      predicted_properties,
      predicted_lca,
      feasibility,
      circularity,
      explanation: "",
      manufacturing_notes: [],
      risks: []
    };

    const llmFields = buildExplanation(candidateBase);
    const scores = computeCompositeScores(candidateBase);
    out.push({ ...candidateBase, ...llmFields, scores });
  }

  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((candidate, idx) => ({ ...candidate, rank: idx + 1 }));
}

function performanceDistance(a: Candidate, b: Candidate): number {
  return avg(
    PERFORMANCE_METRICS.map((k) => Math.abs((a.predicted_properties[k] ?? 50) - (b.predicted_properties[k] ?? 50)))
  );
}

export function suggestMoreRecyclableAlternative(
  input: SessionInput,
  baseCandidate: Candidate,
  materials: Material[] = MATERIALS
): Candidate | null {
  const boostedWeights: Record<MetricKey, number> = normalizeWeights({
    ...(input.weights ?? {}),
    recyclability: 4,
    biodegradability: 2.5,
    microplastic_risk: 2.5
  });

  const altCandidates = generateCandidates(
    {
      ...input,
      weights: boostedWeights,
      constraints: {
        ...(input.constraints ?? {}),
        max_microplastic_risk: "medium"
      }
    },
    materials
  );

  const ranked = altCandidates
    .map((c) => ({
      candidate: c,
      perfGap: performanceDistance(baseCandidate, c),
      circularGain: c.circularity.circularity_score - baseCandidate.circularity.circularity_score
    }))
    .filter((x) => x.circularGain > 0.4 && x.perfGap <= 16)
    .sort((a, b) => b.circularGain - a.circularGain || a.perfGap - b.perfGap);

  if (!ranked.length) return null;
  const picked = ranked[0].candidate;
  return {
    ...picked,
    explanation: `Recyclability-oriented alternative to candidate #${baseCandidate.rank}. ${picked.explanation}`
  };
}
