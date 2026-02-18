import type { SlidersInput } from "@/lib/types";

export type ConflictWarning = {
  id: string;
  title: string;
  detail: string;
  severity: "low" | "medium" | "high";
};

function v(sliders: SlidersInput, key: keyof SlidersInput, fallback = 50): number {
  const n = sliders[key];
  return typeof n === "number" ? n : fallback;
}

export function detectConflicts(sliders: SlidersInput): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];

  const elasticity = v(sliders, "elasticity");
  const biodegradability = v(sliders, "biodegradability");
  if (elasticity >= 75 && biodegradability >= 75) {
    warnings.push({
      id: "elasticity-bio",
      title: "Elasticity vs biodegradability",
      detail: "High stretch often requires elastomer content that can reduce biodegradability.",
      severity: "high"
    });
  }

  const durability = v(sliders, "durability");
  const lightness = v(sliders, "weight_lightness");
  if (durability >= 80 && lightness >= 80) {
    warnings.push({
      id: "durability-lightness",
      title: "Durability vs lightness",
      detail: "Very light constructions can make it harder to maximize long-term durability.",
      severity: "medium"
    });
  }

  const cost = v(sliders, "cost");
  const co2 = v(sliders, "co2");
  if (cost >= 80 && co2 >= 80) {
    warnings.push({
      id: "cost-co2",
      title: "Low cost vs very low CO2",
      detail: "Aggressive cost targets can conflict with the lowest-impact material pathways.",
      severity: "medium"
    });
  }

  return warnings;
}
