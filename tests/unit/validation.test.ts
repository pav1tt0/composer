import { describe, expect, it } from "vitest";
import { generateCandidates } from "@/lib/engine/generate";
import { optimizeSchema, recyclableAlternativeBodySchema } from "@/lib/api-schemas";
import { parseStoredCandidates } from "@/lib/compare-storage";

describe("api schema validation", () => {
  it("accepts valid optimize payload", () => {
    const candidates = generateCandidates({
      use_case: "Sportswear",
      sliders: { durability: 70, breathability: 66 }
    });

    const parsed = optimizeSchema.parse({
      objective: "max_durability",
      candidates: [candidates[0]]
    });

    expect(parsed.candidates.length).toBe(1);
  });

  it("rejects malformed optimize payload", () => {
    expect(() =>
      optimizeSchema.parse({
        objective: "min_cost",
        candidates: [{ rank: 1, score: 0.8 }]
      })
    ).toThrow();
  });

  it("rejects recyclable-alternative payload when candidate shape is incomplete", () => {
    expect(() =>
      recyclableAlternativeBodySchema.parse({
        input: {
          use_case: "Sportswear",
          sliders: { durability: 70 }
        },
        candidate: {
          rank: 1,
          score: 0.9
        }
      })
    ).toThrow();
  });
});

describe("compare storage parser", () => {
  it("returns empty list for invalid json", () => {
    expect(parseStoredCandidates("{bad-json")).toStrictEqual([]);
  });

  it("returns empty list for non-array payload", () => {
    expect(parseStoredCandidates("{\"foo\":1}")).toStrictEqual([]);
  });
});
