import type { UseCaseConfig, UseCaseCategory } from "@/lib/types/useCase";

function normalizeScoreWeights(config: UseCaseConfig): UseCaseConfig {
  const total = Object.values(config.score_weights).reduce((sum, v) => sum + v, 0);
  if (total <= 0) return config;

  return {
    ...config,
    score_weights: {
      performance: Number((config.score_weights.performance / total).toFixed(4)),
      sustainability: Number((config.score_weights.sustainability / total).toFixed(4)),
      circularity: Number((config.score_weights.circularity / total).toFixed(4)),
      cost: Number((config.score_weights.cost / total).toFixed(4)),
      feasibility: Number((config.score_weights.feasibility / total).toFixed(4))
    }
  };
}

const raw: UseCaseConfig[] = [
  {
    id: "sportswear",
    label: "Sportswear",
    category: "APPAREL_PERFORMANCE",
    description: "High breathability and elasticity with balanced circularity.",
    score_weights: { performance: 0.4, sustainability: 0.2, circularity: 0.2, cost: 0.08, feasibility: 0.12 },
    property_bias: { breathability: 1, elasticity: 1, weight_lightness: 0.35, durability: 0.3 },
    constraints: { max_microplastic_risk: 6.5 },
    material_preferences: { preferred_families: ["CELLULOSIC", "BIOPOLYMER"], discouraged_families: ["PROTEIN"] }
  },
  {
    id: "cycling-apparel",
    label: "Cycling Apparel",
    category: "APPAREL_PERFORMANCE",
    description: "Breathability, lightness, and elasticity for high-motion cycling gear.",
    score_weights: { performance: 0.44, sustainability: 0.16, circularity: 0.14, cost: 0.08, feasibility: 0.18 },
    property_bias: { breathability: 0.8, weight_lightness: 1, elasticity: 0.95, durability: 0.4 },
    constraints: { max_microplastic_risk: 7 },
    material_preferences: { preferred_families: ["CELLULOSIC", "BIOPOLYMER"], discouraged_families: ["PROTEIN"] }
  },
  {
    id: "outdoor-technical",
    label: "Outdoor Technical",
    category: "APPAREL_PERFORMANCE",
    description: "Max durability and thermal regulation with stronger feasibility pressure.",
    score_weights: { performance: 0.42, sustainability: 0.14, circularity: 0.12, cost: 0.08, feasibility: 0.24 },
    property_bias: { durability: 1, thermal_regulation: 0.9, weight_lightness: 0.35 },
    constraints: { max_microplastic_risk: 7.5 },
    material_preferences: { preferred_families: ["CELLULOSIC", "BAST", "BIOPOLYMER"] }
  },
  {
    id: "running-apparel",
    label: "Running Apparel",
    category: "APPAREL_PERFORMANCE",
    description: "Max weight lightness and breathability with moderate cost sensitivity.",
    score_weights: { performance: 0.41, sustainability: 0.16, circularity: 0.14, cost: 0.12, feasibility: 0.17 },
    property_bias: { weight_lightness: 1, breathability: 0.95, elasticity: 0.5 },
    constraints: { max_microplastic_risk: 6.5 },
    material_preferences: { preferred_families: ["CELLULOSIC", "NATURAL"], discouraged_families: ["PROTEIN"] }
  },
  {
    id: "base-layers",
    label: "Base Layers",
    category: "APPAREL_PERFORMANCE",
    description: "Softness and thermal regulation with capped microplastic risk.",
    score_weights: { performance: 0.37, sustainability: 0.2, circularity: 0.17, cost: 0.09, feasibility: 0.17 },
    property_bias: { softness: 1, thermal_regulation: 0.95, breathability: 0.35 },
    constraints: { max_microplastic_risk: 5.5 },
    material_preferences: { preferred_families: ["CELLULOSIC", "NATURAL"], discouraged_families: ["SYNTHETIC"] }
  },
  {
    id: "luxury-fashion",
    label: "Luxury Fashion",
    category: "APPAREL_FASHION",
    description: "Softness and handfeel oriented profile with low cost weight.",
    score_weights: { performance: 0.38, sustainability: 0.24, circularity: 0.16, cost: 0.04, feasibility: 0.18 },
    property_bias: { softness: 1, thermal_regulation: 0.55, breathability: 0.35 },
    constraints: { max_microplastic_risk: 5 },
    bonuses: { low_microplastic_bonus: 5 },
    material_preferences: { preferred_families: ["CELLULOSIC", "NATURAL"] }
  },
  {
    id: "fast-fashion",
    label: "Fast Fashion",
    category: "APPAREL_FASHION",
    description: "High cost and feasibility priority with acceptable mid durability.",
    score_weights: { performance: 0.24, sustainability: 0.14, circularity: 0.08, cost: 0.31, feasibility: 0.23 },
    property_bias: { durability: 0.35, softness: 0.2 },
    constraints: { max_microplastic_risk: 7.5 },
    material_preferences: { preferred_families: ["NATURAL", "CELLULOSIC"] }
  },
  {
    id: "tailoring-formal",
    label: "Tailoring Formal",
    category: "APPAREL_FASHION",
    description: "Durability and structure with low elasticity preference.",
    score_weights: { performance: 0.36, sustainability: 0.18, circularity: 0.14, cost: 0.11, feasibility: 0.21 },
    property_bias: { durability: 0.85, elasticity: 0.05, thermal_regulation: 0.2 },
    constraints: { max_microplastic_risk: 6.5 },
    material_preferences: { preferred_families: ["NATURAL", "CELLULOSIC"], discouraged_families: ["BIOPOLYMER"] }
  },
  {
    id: "knitwear",
    label: "Knitwear",
    category: "APPAREL_FASHION",
    description: "Softness and elasticity with medium durability.",
    score_weights: { performance: 0.36, sustainability: 0.2, circularity: 0.16, cost: 0.09, feasibility: 0.19 },
    property_bias: { softness: 1, elasticity: 0.75, durability: 0.35 },
    constraints: { max_microplastic_risk: 6 },
    material_preferences: { preferred_families: ["CELLULOSIC", "NATURAL"] }
  },
  {
    id: "denim",
    label: "Denim",
    category: "APPAREL_FASHION",
    description: "Very high durability with low to medium elasticity.",
    score_weights: { performance: 0.4, sustainability: 0.17, circularity: 0.13, cost: 0.1, feasibility: 0.2 },
    property_bias: { durability: 1, elasticity: 0.25, softness: 0.15 },
    constraints: { max_microplastic_risk: 6.5 },
    material_preferences: { preferred_families: ["BAST", "NATURAL", "CELLULOSIC"] }
  },
  {
    id: "upholstery",
    label: "Upholstery",
    category: "INTERIOR",
    description: "Very high durability, recyclable threshold, and capped microplastic risk.",
    score_weights: { performance: 0.33, sustainability: 0.17, circularity: 0.2, cost: 0.14, feasibility: 0.16 },
    property_bias: { durability: 1, softness: 0.25 },
    constraints: { must_be_recyclable_min: 5.5, max_microplastic_risk: 6, no_elastane: true },
    bonuses: { monomaterial_bonus: 6 },
    material_preferences: { preferred_families: ["NATURAL", "CELLULOSIC"], discouraged_families: ["BIOPOLYMER"] }
  },
  {
    id: "bedding-linens",
    label: "Bedding Linens",
    category: "INTERIOR",
    description: "Softness and breathability focus with moderate circularity pressure.",
    score_weights: { performance: 0.34, sustainability: 0.2, circularity: 0.18, cost: 0.1, feasibility: 0.18 },
    property_bias: { softness: 1, breathability: 0.85, thermal_regulation: 0.25 },
    constraints: { max_microplastic_risk: 5.5 },
    material_preferences: { preferred_families: ["CELLULOSIC", "NATURAL"] }
  },
  {
    id: "curtains-drapery",
    label: "Curtains Drapery",
    category: "INTERIOR",
    description: "Lightness and softness with medium durability targets.",
    score_weights: { performance: 0.31, sustainability: 0.2, circularity: 0.18, cost: 0.13, feasibility: 0.18 },
    property_bias: { weight_lightness: 1, softness: 0.8, durability: 0.35 },
    constraints: { max_microplastic_risk: 6.5 },
    material_preferences: { preferred_families: ["CELLULOSIC", "NATURAL"] }
  },
  {
    id: "workwear",
    label: "Workwear",
    category: "TECHNICAL",
    description: "Highest durability and feasibility with low elasticity bias.",
    score_weights: { performance: 0.36, sustainability: 0.12, circularity: 0.12, cost: 0.13, feasibility: 0.27 },
    property_bias: { durability: 1, elasticity: 0.1, thermal_regulation: 0.25 },
    constraints: { max_microplastic_risk: 7 },
    material_preferences: { preferred_families: ["BAST", "CELLULOSIC"], discouraged_families: ["PROTEIN"] }
  },
  {
    id: "medical-textiles",
    label: "Medical Textiles",
    category: "TECHNICAL",
    description: "Durability and low microplastic profile with medium circularity.",
    score_weights: { performance: 0.34, sustainability: 0.2, circularity: 0.18, cost: 0.08, feasibility: 0.2 },
    property_bias: { durability: 0.8, softness: 0.35, breathability: 0.25 },
    constraints: { max_microplastic_risk: 4.5, must_be_recyclable_min: 5.5 },
    bonuses: { low_microplastic_bonus: 6 },
    material_preferences: { preferred_families: ["CELLULOSIC", "NATURAL"], discouraged_families: ["SYNTHETIC"] }
  },
  {
    id: "automotive-textiles",
    label: "Automotive Textiles",
    category: "TECHNICAL",
    description: "High durability and feasibility, medium cost pressure.",
    score_weights: { performance: 0.34, sustainability: 0.13, circularity: 0.12, cost: 0.17, feasibility: 0.24 },
    property_bias: { durability: 1, thermal_regulation: 0.25, weight_lightness: 0.3 },
    constraints: { max_microplastic_risk: 7.5 },
    material_preferences: { preferred_families: ["CELLULOSIC", "BIOPOLYMER"] }
  },
  {
    id: "circular-design",
    label: "Circular Design",
    category: "SUSTAINABILITY",
    description: "Max circularity profile with strict monomaterial and no-elastane constraints.",
    score_weights: { performance: 0.2, sustainability: 0.25, circularity: 0.37, cost: 0.07, feasibility: 0.11 },
    property_bias: { durability: 0.35, breathability: 0.2 },
    constraints: { must_be_recyclable_min: 6, max_microplastic_risk: 4.5, no_elastane: true, prefer_monomaterial: true },
    bonuses: { monomaterial_bonus: 8, low_microplastic_bonus: 8 },
    material_preferences: { preferred_families: ["CELLULOSIC", "BAST", "NATURAL"], discouraged_families: ["SYNTHETIC"] }
  },
  {
    id: "biodegradable-products",
    label: "Biodegradable Products",
    category: "SUSTAINABILITY",
    description: "High circularity profile discouraging synthetics with capped microplastic risk.",
    score_weights: { performance: 0.24, sustainability: 0.28, circularity: 0.28, cost: 0.08, feasibility: 0.12 },
    property_bias: { softness: 0.25, breathability: 0.2, durability: 0.3 },
    constraints: { max_microplastic_risk: 4.8, must_be_recyclable_min: 6 },
    bonuses: { low_microplastic_bonus: 7 },
    material_preferences: { preferred_families: ["NATURAL", "CELLULOSIC", "BAST"], discouraged_families: ["SYNTHETIC", "BIOPOLYMER"] }
  }
];

export const USE_CASES: UseCaseConfig[] = raw.map(normalizeScoreWeights);

export const USE_CASES_BY_ID = new Map(USE_CASES.map((useCase) => [useCase.id, useCase]));

export const DEFAULT_USE_CASE_ID = "sportswear";

export const USE_CASE_CATEGORY_LABELS: Record<UseCaseCategory, string> = {
  APPAREL_PERFORMANCE: "Apparel Performance",
  APPAREL_FASHION: "Apparel Fashion",
  INTERIOR: "Interior",
  TECHNICAL: "Technical",
  SUSTAINABILITY: "Sustainability"
};
