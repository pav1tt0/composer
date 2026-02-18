import { describe, expect, it } from "vitest";
import { generateCandidates } from "@/lib/engine/generate";

describe("smoke flow", () => {
  it("generate -> result cards data shape", () => {
    const candidates = generateCandidates({
      use_case: "Sportswear",
      sliders: { breathability: 70, elasticity: 50, durability: 66 },
      constraints: { no_animal_fibers: true, max_cost: 8 }
    });

    expect(candidates.length).toBeGreaterThanOrEqual(3);
    expect(candidates[0].predicted_lca.co2_kg_per_kg).toBeGreaterThan(0);
    expect(candidates[0].composition[0].name.length).toBeGreaterThan(0);
  });
});
