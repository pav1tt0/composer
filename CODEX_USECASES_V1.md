# CODEX_USECASES_V1.md — Intelligent Use-Case System (V1)
Owner: Paolo  
Project: AI Material Composer  
Stack: Next.js (App Router) + Supabase (Postgres) + existing engine

## Purpose
Replace the simple `use-case dropdown (Sportswear, Denim, Luxury, Interior)` with an extensible, intelligent system that:
- expands available use-cases (grouped by category)
- meaningfully impacts ranking, constraints, and recommendations
- remains config-driven (easy to add/modify use-cases without editing logic)
- remains backward compatible with existing sessions

---

## 0) Definition of Done (DoD)
This work is DONE when:

### Data/Config
- [ ] Use-cases live in a single config file (`/lib/config/useCases.ts`)
- [ ] Each use-case has a stable `id` (slug) and belongs to a category
- [ ] Each use-case defines:
  - score weights (performance/sustainability/circularity/cost/feasibility)
  - property priorities (bias on target properties)
  - constraints (hard filters + soft penalties)
  - optional material family preferences

### Engine
- [ ] Selected use-case modifies ranking and/or filtering in a measurable way
- [ ] Deterministic output for same input remains true

### UI
- [ ] UI selector is grouped by category, searchable, and shows a short description
- [ ] Selection persists in session storage or DB and is used during generation

### Backward Compatibility
- [ ] Old sessions with plain `use_case` string are mapped to new `use_case_id`

### Tests
- [ ] Unit tests prove: changing use-case changes ranking
- [ ] Integration/smoke tests cover at least 3 use-cases with visibly different behavior

---

## 1) Design Model
### 1.1 Use-case shape (TypeScript)
Create types in `/lib/types/useCase.ts`:

```ts
export type UseCaseCategory =
  | "APPAREL_PERFORMANCE"
  | "APPAREL_FASHION"
  | "INTERIOR"
  | "TECHNICAL"
  | "SUSTAINABILITY";

export type EolConstraint = {
  prefer_monomaterial?: boolean;
  no_elastane?: boolean;
  must_be_recyclable_min?: number; // 0–10
  max_microplastic_risk?: number;  // 0–10
};

export type MaterialPreference = {
  preferred_families?: string[];   // e.g. ["CELLULOSIC","BAST"]
  discouraged_families?: string[]; // e.g. ["POLYESTER"]
};

export type PropertyBias = Partial<Record<
  | "breathability"
  | "elasticity"
  | "durability"
  | "softness"
  | "thermal_regulation"
  | "weight_lightness",
  number // 0..1
>>;

export type ScoreWeights = {
  performance: number;    // 0..1
  sustainability: number; // 0..1
  circularity: number;    // 0..1
  cost: number;           // 0..1
  feasibility: number;    // 0..1
};

export type UseCaseConfig = {
  id: string;           // stable slug e.g. "cycling-apparel"
  label: string;        // UI label
  category: UseCaseCategory;
  description: string;  // short 1–2 lines

  score_weights: ScoreWeights; // MUST normalize to sum=1
  property_bias: PropertyBias; // influences ranking/similarity scoring
  constraints?: EolConstraint; // filters/penalties
  material_preferences?: MaterialPreference;

  // Optional: small scoring nudges
  bonuses?: {
    monomaterial_bonus?: number; // 0..10 points (scaled later)
    low_microplastic_bonus?: number;
  };
};
