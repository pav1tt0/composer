import { describe, expect, it } from "vitest";
import { detectConflicts } from "@/lib/conflicts";

describe("conflict detector", () => {
  it("detects elasticity vs biodegradability conflict", () => {
    const warnings = detectConflicts({ elasticity: 90, biodegradability: 90 });
    expect(warnings.some((w) => w.id === "elasticity-bio")).toBe(true);
  });

  it("detects durability vs lightness conflict", () => {
    const warnings = detectConflicts({ durability: 90, weight_lightness: 85 });
    expect(warnings.some((w) => w.id === "durability-lightness")).toBe(true);
  });

  it("returns no warnings for balanced targets", () => {
    const warnings = detectConflicts({ durability: 60, elasticity: 55, biodegradability: 60, cost: 60, co2: 60 });
    expect(warnings.length).toBe(0);
  });
});
