import type { SupabaseClient } from "@supabase/supabase-js";
import { ALL_METRICS, type Material, type MetricKey } from "@/lib/types";
import { MATERIALS } from "@/lib/materials";
import { TABLES } from "@/lib/db-config";

type LegacyDbRow = {
  id: string;
  name: string;
  category: string;
  properties_json: Record<string, number>;
  lca_json: { co2_kg_per_kg?: number; water_l_per_kg?: number; energy_mj_per_kg?: number };
  constraints_json: { biodegradability_class?: string; microplastic_risk?: string; animal_fiber?: boolean };
  min_cost: number | null;
  max_cost: number | null;
  trl: number | null;
};

type SustaidRow = {
  material_id: string;
  material_name: string;
  category: string;
  sustainability_score: number | string | null;
  ghg_emissions: string | null;
  water_consumption: string | null;
  energy_use: string | null;
  biodegradability: string | null;
  durability: string | null;
  tensile_strength: string | null;
  moisture_absorption: string | null;
  temperature_resistance: string | null;
  elasticity: string | null;
  dyeability: string | null;
  comfort_level: string | null;
  cost_range: string | null;
  primary_applications: string | null;
  sustainability_rating: string | null;
};

const validCategory = new Set<Material["category"]>(["MMCF", "Bast", "Natural", "Synthetic", "BioPolymer", "Protein"]);

function clamp100(value: unknown, fallback = 50): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, num));
}

function parseMidRange(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const nums = (raw.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (!nums.length) return null;
  if (nums.length === 1) return nums[0];
  return (nums[0] + nums[1]) / 2;
}

function levelToScore(raw: string | null | undefined, fallback = 50): number {
  if (!raw) return fallback;
  const value = raw.toLowerCase();
  if (value.includes("very high")) return 92;
  if (value.includes("high")) return value.includes("medium") ? 75 : 85;
  if (value.includes("medium")) return value.includes("low") ? 40 : value.includes("high") ? 65 : 55;
  if (value.includes("low")) return 25;
  return fallback;
}

function inverseToScore(value: number, min: number, max: number): number {
  const n = Math.max(min, Math.min(max, value));
  return clamp100(((max - n) / (max - min)) * 100, 50);
}

function mapCategory(raw: string): Material["category"] {
  const lc = raw.toLowerCase();
  if (validCategory.has(raw as Material["category"])) return raw as Material["category"];
  if (lc.includes("cellulosic") || lc.includes("mmcf")) return "MMCF";
  if (lc.includes("bast")) return "Bast";
  if (lc.includes("synthetic") || lc.includes("polyester") || lc.includes("nylon")) return "Synthetic";
  if (lc.includes("protein") || lc.includes("wool") || lc.includes("silk")) return "Protein";
  if (lc.includes("bio") || lc.includes("polymer")) return "BioPolymer";
  return "Natural";
}

function toLegacyMaterial(row: LegacyDbRow): Material {
  const properties = {} as Record<MetricKey, number>;
  for (const key of ALL_METRICS) {
    properties[key] = clamp100(row.properties_json?.[key], 50);
  }

  return {
    id: String(row.id),
    name: row.name,
    category: mapCategory(row.category),
    properties,
    lca: {
      co2_kg_per_kg: Number(row.lca_json?.co2_kg_per_kg ?? 5),
      water_l_per_kg: Number(row.lca_json?.water_l_per_kg ?? 2000),
      energy_mj_per_kg: Number(row.lca_json?.energy_mj_per_kg ?? 40)
    },
    constraints: {
      biodegradability_class: (row.constraints_json?.biodegradability_class as Material["constraints"]["biodegradability_class"]) ?? "medium",
      microplastic_risk: (row.constraints_json?.microplastic_risk as Material["constraints"]["microplastic_risk"]) ?? "medium",
      animal_fiber: Boolean(row.constraints_json?.animal_fiber)
    },
    cost_min: Number(row.min_cost ?? 3),
    cost_max: Number(row.max_cost ?? 8),
    trl: Number(row.trl ?? 6)
  };
}

function toSustaidMaterial(row: SustaidRow): Material {
  const co2Mid = parseMidRange(row.ghg_emissions);
  const waterMid = parseMidRange(row.water_consumption);
  const energyMid = parseMidRange(row.energy_use);
  const costMid = parseMidRange(row.cost_range);
  const tensileMid = parseMidRange(row.tensile_strength);
  const moistureMid = parseMidRange(row.moisture_absorption);
  const tempMid = parseMidRange(row.temperature_resistance);

  const sustainabilityScore = clamp100(Number(row.sustainability_score ?? 2.5) * 20, 50);
  const biodegradabilityScore = levelToScore(row.biodegradability, 55);
  const durabilityScore = levelToScore(row.durability, 55);
  const elasticityScore = levelToScore(row.elasticity, 50);
  const comfortScore = levelToScore(row.comfort_level, 60);
  const dyeabilityScore = levelToScore(row.dyeability, 55);

  const properties: Record<MetricKey, number> = {
    breathability: clamp100(comfortScore + 5, 60),
    elasticity: elasticityScore,
    durability: clamp100((durabilityScore + clamp100((tensileMid ?? 120) / 3, 50)) / 2, 55),
    softness: comfortScore,
    thermal_regulation: clamp100((tempMid ?? 170) / 3, 56),
    weight_lightness: 60,
    co2: co2Mid ? inverseToScore(co2Mid, 1, 25) : sustainabilityScore,
    water: waterMid ? inverseToScore(waterMid, 300, 6000) : sustainabilityScore,
    energy: energyMid ? inverseToScore(energyMid, 20, 250) : sustainabilityScore,
    biodegradability: biodegradabilityScore,
    microplastic_risk: mapCategory(row.category) === "Synthetic" ? 20 : 85,
    recyclability: sustainabilityScore,
    cost: costMid ? inverseToScore(costMid, 1, 30) : 50,
    scalability: levelToScore(row.sustainability_rating, 55)
  };

  const category = mapCategory(row.category);
  const isAnimal = category === "Protein";

  const microRisk: Material["constraints"]["microplastic_risk"] = category === "Synthetic" ? "high" : "low";

  const biodegClass: Material["constraints"]["biodegradability_class"] =
    biodegradabilityScore >= 70 ? "high" : biodegradabilityScore >= 45 ? "medium" : "low";

  return {
    id: String(row.material_id),
    name: row.material_name,
    category,
    properties,
    lca: {
      co2_kg_per_kg: Number((co2Mid ?? 6).toFixed(2)),
      water_l_per_kg: Number((waterMid ?? 2000).toFixed(0)),
      energy_mj_per_kg: Number((energyMid ?? 90).toFixed(1))
    },
    constraints: {
      biodegradability_class: biodegClass,
      microplastic_risk: microRisk,
      animal_fiber: isAnimal
    },
    cost_min: Number(((costMid ?? 6) * 0.8).toFixed(2)),
    cost_max: Number(((costMid ?? 6) * 1.2).toFixed(2)),
    trl: Math.max(3, Math.min(9, Math.round((properties.scalability / 100) * 9)))
  };
}

type AnySupabaseClient = SupabaseClient<any, any, any, any, any>;

export async function getMaterialCatalog(supabase: AnySupabaseClient | null): Promise<Material[]> {
  if (!supabase) return MATERIALS;

  const legacy = await supabase
    .from(TABLES.materials)
    .select("id,name,category,properties_json,lca_json,constraints_json,min_cost,max_cost,trl")
    .limit(500);

  if (!legacy.error && legacy.data && legacy.data.length >= 3) {
    return (legacy.data as LegacyDbRow[]).map(toLegacyMaterial);
  }

  const sustaid = await supabase
    .from(TABLES.materials)
    .select(
      "material_id,material_name,category,sustainability_score,ghg_emissions,water_consumption,energy_use,biodegradability,durability,tensile_strength,moisture_absorption,temperature_resistance,elasticity,dyeability,comfort_level,cost_range,primary_applications,sustainability_rating"
    )
    .limit(500);

  if (!sustaid.error && sustaid.data && sustaid.data.length >= 3) {
    return (sustaid.data as SustaidRow[]).map(toSustaidMaterial);
  }

  return MATERIALS;
}
