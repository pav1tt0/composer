import { ALL_METRICS, type CompositionPart, type Material, type MetricKey } from "@/lib/types";
import { applySynergyRules, estimateSupplyRisk } from "@/lib/engine/rules";

export function predictBlend(
  composition: CompositionPart[],
  materialById: Map<string, Material>
): {
  predicted_properties: Record<MetricKey, number>;
  predicted_lca: { co2_kg_per_kg: number; water_l_per_kg: number; energy_mj_per_kg: number };
  feasibility: { trl_est: number; supply_risk: "low" | "medium" | "high" };
} {
  const metricOut = {} as Record<MetricKey, number>;
  for (const key of ALL_METRICS) metricOut[key] = 0;

  let co2 = 0;
  let water = 0;
  let energy = 0;
  let trl = 0;

  for (const part of composition) {
    const mat = materialById.get(part.material_id);
    if (!mat) continue;

    for (const key of ALL_METRICS) {
      metricOut[key] += (mat.properties[key] * part.pct) / 100;
    }

    co2 += (mat.lca.co2_kg_per_kg * part.pct) / 100;
    water += (mat.lca.water_l_per_kg * part.pct) / 100;
    energy += (mat.lca.energy_mj_per_kg * part.pct) / 100;
    trl += (mat.trl * part.pct) / 100;
  }

  const synergy = applySynergyRules(metricOut, composition, materialById);
  const predicted_properties = {} as Record<MetricKey, number>;
  for (const key of ALL_METRICS) {
    predicted_properties[key] = Math.max(0, Math.min(100, Number((synergy[key] ?? metricOut[key]).toFixed(1))));
  }

  return {
    predicted_properties,
    predicted_lca: {
      co2_kg_per_kg: Number(co2.toFixed(2)),
      water_l_per_kg: Number(water.toFixed(0)),
      energy_mj_per_kg: Number(energy.toFixed(1))
    },
    feasibility: {
      trl_est: Number(trl.toFixed(1)),
      supply_risk: estimateSupplyRisk(composition, materialById)
    }
  };
}
