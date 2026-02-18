import type { CompositionPart, Material } from "@/lib/types";

const riskValue = {
  low: 1,
  medium: 2,
  high: 3
} as const;

export function applySynergyRules(
  base: Record<string, number>,
  composition: CompositionPart[],
  materialById: Map<string, Material>
): Record<string, number> {
  const result = { ...base };

  for (const part of composition) {
    const mat = materialById.get(part.material_id);
    if (!mat) continue;

    if (mat.name.toLowerCase().includes("hemp") && part.pct >= 20) {
      result.durability = Math.min(100, result.durability + 5);
      result.softness = Math.max(0, result.softness - 4);
    }

    if (mat.name.toLowerCase().includes("elastane") && part.pct >= 8) {
      result.elasticity = Math.min(100, result.elasticity + 8);
      result.biodegradability = Math.max(0, result.biodegradability - 8);
      result.microplastic_risk = Math.max(0, result.microplastic_risk - 6);
    }
  }

  return result;
}

export function estimateSupplyRisk(composition: CompositionPart[], materialById: Map<string, Material>): "low" | "medium" | "high" {
  let trlAvg = 0;
  let riskWeighted = 0;

  for (const part of composition) {
    const mat = materialById.get(part.material_id);
    if (!mat) continue;
    trlAvg += (mat.trl * part.pct) / 100;
    riskWeighted += (riskValue[mat.constraints.microplastic_risk] * part.pct) / 100;
  }

  if (trlAvg >= 8 && riskWeighted <= 1.4) return "low";
  if (trlAvg >= 6) return "medium";
  return "high";
}
