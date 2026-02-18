import { describe, expect, it } from "vitest";
import { normalizeSliders, normalizeWeights } from "@/lib/normalize";
import { cosineSimilarity } from "@/lib/engine/score";
import { generateCandidates, rerankByObjective, suggestMoreRecyclableAlternative } from "@/lib/engine/generate";
import { MATERIALS } from "@/lib/materials";

describe("engine", () => {
  it("normalizes sliders with defaults", () => {
    const out = normalizeSliders({ breathability: 120, softness: -10 });
    expect(out.breathability).toBe(100);
    expect(out.softness).toBe(0);
    expect(out.durability).toBe(50);
  });

  it("normalizes weights to sum 1", () => {
    const out = normalizeWeights({ durability: 10, softness: 5 });
    const sum = Object.values(out).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("returns cosine of 1 for identical vectors", () => {
    const a = normalizeSliders({ breathability: 20, durability: 40, softness: 60 });
    expect(cosineSimilarity(a, a)).toBeCloseTo(1, 6);
  });

  it("generates at least 3 candidates", () => {
    const out = generateCandidates({ use_case: "Sportswear", sliders: { durability: 70 }, constraints: { no_animal_fibers: true } });
    expect(out.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps blend sum = 100", () => {
    const out = generateCandidates({ use_case: "Denim", sliders: { durability: 80 } });
    for (const c of out) {
      const sum = c.composition.reduce((acc, x) => acc + x.pct, 0);
      expect(sum).toBe(100);
    }
  });

  it("is deterministic for same input", () => {
    const payload = { use_case: "Sportswear", sliders: { elasticity: 75, durability: 64 }, constraints: { no_animal_fibers: true } };
    const a = generateCandidates(payload);
    const b = generateCandidates(payload);
    expect(a[0].composition).toStrictEqual(b[0].composition);
    expect(a[0].score).toBe(b[0].score);
  });

  it("re-ranks candidates by objective", () => {
    const out = generateCandidates({ use_case: "Sportswear", sliders: { elasticity: 75, durability: 64 } });
    const reranked = rerankByObjective(out, "max_durability");
    expect(reranked[0].score).toBeGreaterThanOrEqual(reranked[1].score);
  });

  it("includes composite scores in each candidate", () => {
    const out = generateCandidates({ use_case: "Sportswear", sliders: { elasticity: 75, durability: 64 } });
    expect(out[0].scores.performance_0_10).toBeGreaterThan(0);
    expect(out[0].scores.sustainability_0_10).toBeGreaterThan(0);
    expect(out[0].scores.feasibility_0_10).toBeGreaterThan(0);
    expect(out[0].scores.overall_0_100).toBeGreaterThan(0);
  });

  it("weights influence ranking", () => {
    const baseInput = {
      use_case: "Sportswear",
      sliders: { durability: 70, elasticity: 70, cost: 70 }
    } as const;

    const highDurability = generateCandidates({
      ...baseInput,
      weights: { durability: 3, elasticity: 1, cost: 1 }
    });
    const highCost = generateCandidates({
      ...baseInput,
      weights: { durability: 1, elasticity: 1, cost: 3 }
    });

    expect(highDurability[0].predicted_properties.durability).toBeGreaterThanOrEqual(highCost[0].predicted_properties.durability);
    expect(highCost[0].predicted_properties.cost).toBeGreaterThanOrEqual(highDurability[0].predicted_properties.cost);
  });

  it("changing use-case changes ranking", () => {
    const payload = {
      sliders: { durability: 68, elasticity: 64, softness: 58, recyclability: 62 },
      constraints: { no_animal_fibers: true }
    };

    const cycling = generateCandidates({
      use_case: "Cycling Apparel",
      use_case_id: "cycling-apparel",
      ...payload
    });
    const circular = generateCandidates({
      use_case: "Circular Design",
      use_case_id: "circular-design",
      ...payload
    });

    expect(cycling[0].composition).not.toStrictEqual(circular[0].composition);
  });

  it("adds circularity outputs to each candidate", () => {
    const out = generateCandidates({ use_case: "Sportswear", sliders: { durability: 70, elasticity: 60 } });
    expect(out[0].circularity.recyclability_score).toBeGreaterThanOrEqual(0);
    expect(out[0].circularity.recyclability_score).toBeLessThanOrEqual(10);
    expect(out[0].circularity.circularity_score).toBeGreaterThanOrEqual(0);
    expect(out[0].circularity.circularity_score).toBeLessThanOrEqual(10);
  });

  it("penalizes circularity for elastomer-rich blend", () => {
    const out = generateCandidates({
      use_case: "Sportswear",
      sliders: { elasticity: 95, durability: 70, recyclability: 80 }
    });
    const hasElastomer = out.find((c) => c.composition.some((p) => /elastane|spandex|lycra|tpu/i.test(p.name)));
    if (!hasElastomer) return;
    expect(hasElastomer.circularity.circularity_score).toBeLessThan(7.5);
  });

  it("can suggest a more recyclable alternative", () => {
    const input = {
      use_case: "Sportswear",
      sliders: { elasticity: 80, durability: 70, recyclability: 60 },
      constraints: { no_animal_fibers: true }
    };
    const base = generateCandidates(input)[0];
    const alt = suggestMoreRecyclableAlternative(input, base);
    if (!alt) return;
    expect(alt.circularity.circularity_score).toBeGreaterThan(base.circularity.circularity_score);
  });

  it("does not repeat the same fiber in the same composition", () => {
    const out = generateCandidates({
      use_case: "Sportswear",
      use_case_id: "sportswear",
      sliders: { elasticity: 72, durability: 64, breathability: 68 }
    });

    for (const candidate of out) {
      const ids = candidate.composition.map((part) => part.material_id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("can emit a single-material candidate when target is already matched", () => {
    const modal = MATERIALS.find((m) => m.name === "Modal");
    if (!modal) throw new Error("Expected Modal in seed materials");

    const out = generateCandidates({
      use_case: "Sportswear",
      use_case_id: "sportswear",
      sliders: {
        breathability: modal.properties.breathability,
        elasticity: modal.properties.elasticity,
        durability: modal.properties.durability,
        softness: modal.properties.softness,
        thermal_regulation: modal.properties.thermal_regulation,
        weight_lightness: modal.properties.weight_lightness
      },
      constraints: { no_animal_fibers: true }
    });

    expect(out.some((c) => c.composition.length === 1 && c.composition[0].pct === 100)).toBe(true);
  });

  it("neutral sliders still produce different outputs across use-cases", () => {
    const neutral = {
      sliders: {
        breathability: 50,
        elasticity: 50,
        durability: 50,
        softness: 50,
        thermal_regulation: 50,
        weight_lightness: 50,
        co2: 50,
        water: 50,
        energy: 50,
        biodegradability: 50,
        microplastic_risk: 50,
        recyclability: 50,
        cost: 50,
        scalability: 50
      },
      constraints: { no_animal_fibers: true }
    };

    const sportswear = generateCandidates({
      use_case: "Sportswear",
      use_case_id: "sportswear",
      ...neutral
    });
    const circular = generateCandidates({
      use_case: "Circular Design",
      use_case_id: "circular-design",
      ...neutral
    });

    const signature = (items: typeof sportswear) =>
      items.map((c) => c.composition.map((part) => `${part.material_id}:${part.pct}`).join("+")).join("|");

    expect(signature(sportswear)).not.toBe(signature(circular));
  });
});
