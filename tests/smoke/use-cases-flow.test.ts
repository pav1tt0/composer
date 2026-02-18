import { describe, expect, it } from "vitest";
import { generateCandidates } from "@/lib/engine/generate";

function avg(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
}

describe("use-case smoke behavior", () => {
  it("shows visibly different outcomes across 3 use-cases", () => {
    const baseInput = {
      sliders: {
        breathability: 68,
        elasticity: 62,
        durability: 70,
        softness: 60,
        biodegradability: 72,
        recyclability: 66
      },
      constraints: { no_animal_fibers: true }
    };

    const cycling = generateCandidates({
      use_case: "Cycling Apparel",
      use_case_id: "cycling-apparel",
      ...baseInput
    });
    const luxury = generateCandidates({
      use_case: "Luxury Fashion",
      use_case_id: "luxury-fashion",
      ...baseInput
    });
    const circular = generateCandidates({
      use_case: "Circular Design",
      use_case_id: "circular-design",
      ...baseInput
    });

    const cyclingElasticity = avg(cycling.map((c) => c.predicted_properties.elasticity));
    const luxurySoftness = avg(luxury.map((c) => c.predicted_properties.softness));
    const cyclingCircularity = avg(cycling.map((c) => c.circularity.circularity_score));
    const circularCircularity = avg(circular.map((c) => c.circularity.circularity_score));
    expect(cyclingElasticity).toBeGreaterThan(avg(luxury.map((c) => c.predicted_properties.elasticity)) - 1);
    expect(luxurySoftness).toBeGreaterThan(avg(cycling.map((c) => c.predicted_properties.softness)));
    expect(circularCircularity).toBeGreaterThanOrEqual(cyclingCircularity - 0.2);
  });
});
