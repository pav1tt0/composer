import { describe, expect, it } from "vitest";
import { normalizeSliders, normalizeWeights } from "@/lib/normalize";
import { cosineSimilarity } from "@/lib/engine/score";
import { generateCandidates, rerankByObjective, suggestMoreRecyclableAlternative } from "@/lib/engine/generate";

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

    expect(highDurability[0].composition).not.toStrictEqual(highCost[0].composition);
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
});
