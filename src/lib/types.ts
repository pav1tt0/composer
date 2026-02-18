export const PERFORMANCE_METRICS = [
  "breathability",
  "elasticity",
  "durability",
  "softness",
  "thermal_regulation",
  "weight_lightness"
] as const;

export const SUSTAINABILITY_METRICS = [
  "co2",
  "water",
  "energy",
  "biodegradability",
  "microplastic_risk",
  "recyclability"
] as const;

export const ECONOMIC_METRICS = ["cost", "scalability"] as const;

export const ALL_METRICS = [...PERFORMANCE_METRICS, ...SUSTAINABILITY_METRICS, ...ECONOMIC_METRICS] as const;

export type MetricKey = (typeof ALL_METRICS)[number];

export type Material = {
  id: string;
  name: string;
  category: "MMCF" | "Bast" | "Natural" | "Synthetic" | "BioPolymer" | "Protein";
  properties: Record<MetricKey, number>;
  lca: {
    co2_kg_per_kg: number;
    water_l_per_kg: number;
    energy_mj_per_kg: number;
  };
  constraints: {
    biodegradability_class: "high" | "medium" | "low";
    microplastic_risk: "low" | "medium" | "high";
    animal_fiber: boolean;
  };
  cost_min: number;
  cost_max: number;
  trl: number;
};

export type SlidersInput = Partial<Record<MetricKey, number>>;
export type WeightsInput = Partial<Record<MetricKey, number>>;

export type GenerateConstraints = {
  must_biodegradable?: boolean;
  no_animal_fibers?: boolean;
  max_microplastic_risk?: "low" | "medium" | "high";
  max_cost?: number;
};

export type SessionInput = {
  use_case: string;
  sliders: SlidersInput;
  weights?: WeightsInput;
  constraints?: GenerateConstraints;
};

export type CompositionPart = {
  material_id: string;
  name: string;
  pct: number;
};

export type Candidate = {
  rank: number;
  score: number;
  scores: {
    performance_0_10: number;
    sustainability_0_10: number;
    feasibility_0_10: number;
    overall_0_100: number;
  };
  composition: CompositionPart[];
  predicted_properties: Record<MetricKey, number>;
  predicted_lca: {
    co2_kg_per_kg: number;
    water_l_per_kg: number;
    energy_mj_per_kg: number;
  };
  feasibility: {
    trl_est: number;
    supply_risk: "low" | "medium" | "high";
  };
  circularity: {
    recyclability_score: number;
    separation_difficulty: number;
    microplastic_risk: number;
    eol_pathway: "MECHANICAL_RECYCLING" | "CHEMICAL_RECYCLING" | "INDUSTRIAL_COMPOST" | "LANDFILL_RISK" | "UNKNOWN";
    circularity_score: number;
    notes: string[];
  };
  explanation: string;
  manufacturing_notes: string[];
  risks: string[];
};
