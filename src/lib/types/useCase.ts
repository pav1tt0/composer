import type { MetricKey } from "@/lib/types";

export type UseCaseCategory =
  | "APPAREL_PERFORMANCE"
  | "APPAREL_FASHION"
  | "INTERIOR"
  | "TECHNICAL"
  | "SUSTAINABILITY";

export type EolConstraint = {
  prefer_monomaterial?: boolean;
  no_elastane?: boolean;
  must_be_recyclable_min?: number;
  max_microplastic_risk?: number;
};

export type MaterialPreference = {
  preferred_families?: string[];
  discouraged_families?: string[];
};

export type PropertyBias = Partial<
  Record<
    | "breathability"
    | "elasticity"
    | "durability"
    | "softness"
    | "thermal_regulation"
    | "weight_lightness",
    number
  >
>;

export type ScoreWeights = {
  performance: number;
  sustainability: number;
  circularity: number;
  cost: number;
  feasibility: number;
};

export type UseCaseConfig = {
  id: string;
  label: string;
  category: UseCaseCategory;
  description: string;
  score_weights: ScoreWeights;
  property_bias: PropertyBias;
  target_hint?: Partial<Record<MetricKey, number>>;
  constraints?: EolConstraint;
  material_preferences?: MaterialPreference;
  bonuses?: {
    monomaterial_bonus?: number;
    low_microplastic_bonus?: number;
  };
};
