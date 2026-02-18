# AI Material Composer — Product Spec (MVP → V1)
Owner: Paolo
Target stack: Next.js + Supabase (Postgres) + OpenAI API
Goal: Webapp che, dato un set di proprietà target (slider), genera:
- 3–8 composizioni/blend reali (fibre + tecnologie)
- stima performance + impatto ambientale
- spiegazione e varianti “ottimizzate”
- materiali esistenti simili (similarity search)

## 0) Definition of Done (DoD)
MVP è “done” quando:
1) L’utente può impostare slider e premere **Generate**
2) La UI mostra almeno 3 candidati con:
   - composizione (percentuali)
   - performance score (0–100) per 6 metriche
   - impatto stimato (CO2, acqua, energia) + biodegradabilità / microplastic risk
   - note su fattibilità (TRL + rischio supply chain)
3) I dati sono salvati e recuperabili (job history) in Supabase
4) Test minimi passano (unit + smoke e2e)

Non obiettivo MVP:
- procurement reale / listini live
- modelli ML addestrati custom (useremo regole + similarity + LLM)

---

## 1) Personas & User Stories
### Personas
- Fashion designer: vuole materiale “ideale” per un capo e capire alternative
- R&D / material scout: vuole esplorare blend plausibili e confronti rapidi
- Sustainability analyst: vuole stime LCA e trade-off

### User Stories (MVP)
US1: come designer, imposto slider e ottengo blend consigliati per “sportswear / biking”
US2: confronto candidati e salvo un favorito
US3: vedo “varianti ottimizzate” (Min CO2 / Min cost / Max durability)
US4: rivedo storico generazioni (ultimi 20)

---

## 2) UX / Screens (MVP)
### Screen A — Composer
- Left: slider (10–12 max)
- Right: “context”
  - use-case dropdown (Sportswear, Denim, Luxury, Interior)
  - constraints: “must be biodegradable”, “no animal fibers”, “max cost”
- CTA: Generate

### Screen B — Results
- Lista cards (3–8)
  - Composition (percent)
  - Radar / bar micro-chart (6 performance)
  - Impact block (CO2, water, energy)
  - Feasibility: TRL + flags
  - Buttons: “Save”, “Optimize”, “Find similar”
- Tabs: Overview / Technical / Sustainability / Manufacturing Notes

### Screen C — History
- elenco sessioni con timestamp + input sintetico + top result

UI components:
- Slider, Select, Card, Badge, Tabs
- Charts: Recharts (radar/bar) oppure semplice SVG

---

## 3) Data Model (Supabase / Postgres)
### Tables
#### materials
- id (uuid, pk)
- name (text) e.g. "Lyocell"
- category (text) e.g. "MMCF", "Bast", "Synthetic", "Protein"
- properties_json (jsonb) — per metriche normalizzate 0–100
- lca_json (jsonb) — CO2_kg_per_kg, water_l_per_kg, energy_mj_per_kg, etc
- constraints_json (jsonb) — biodegradability_class, microplastic_risk, recyclability
- cost_range (numrange) or (min_cost, max_cost) — eur/kg (placeholder)
- trl (int 1–9)
- sources (jsonb) — citations/refs

#### processes (optional MVP; can be json config)
- id, name (knit/weave/finish)
- effects_json (jsonb) — come modifica le metriche

#### generation_sessions
- id (uuid, pk)
- created_at (timestamptz)
- use_case (text)
- sliders_json (jsonb) — target metrics + weights
- constraints_json (jsonb) — hard constraints
- user_id (uuid nullable, for auth later)

#### generation_candidates
- id (uuid pk)
- session_id (uuid fk)
- rank (int)
- composition_json (jsonb) — [{material_id, pct}, ...]
- process_json (jsonb) — knit/finish chosen
- predicted_properties_json (jsonb) — 0–100 metrics
- predicted_lca_json (jsonb)
- feasibility_json (jsonb) — trl_est, supply_risk flags
- explanation (text) — LLM-generated summary

#### favorites (optional MVP)
- id, user_id, candidate_id

### Normalized Metrics (0–100)
Performance:
- breathability
- elasticity
- durability
- softness
- thermal_regulation
- weight_lightness

Sustainability:
- co2 (lower is better -> invert to score)
- water (lower is better)
- energy (lower is better)
- biodegradability
- microplastic_risk (lower is better)
- recyclability

Economics:
- cost (lower is better)
- scalability (proxy via TRL / category)

---

## 4) Recommendation Engine (MVP algorithm)
Approccio ibrido (rule + search + LLM):
1) Normalize input slider -> target vector T (0–100) + weights W
2) Filter materials by hard constraints:
   - no_animal, must_biodegradable, max_microplastic_risk, etc
3) Generate candidate blends:
   - start from top-K single materials close to T (cosine similarity)
   - create 2–3 material blends:
     - base (50–70%) + secondary (20–40%) + additive (5–20% e.g. bio-elastane)
   - enforce that sum pct = 100 and pct bounds per category
4) Predict blend properties:
   - weighted average + simple synergy rules:
     - hemp increases durability but may reduce softness
     - elastane increases elasticity but affects biodegradability score
5) Rank candidates:
   - score = Σ_i W_i * similarity(pred_i, T_i) + penalties (cost, feasibility risk)
6) Use LLM only to:
   - generate explanation, “manufacturing notes”, and 2 optimization variants
   - NOT to invent numbers (numeri devono venire dal motore)

Optimization variants:
- MinCO2: re-rank with CO2 weight boosted, cost weight stable
- MinCost: cost boosted
- MaxDurability: durability boosted

Similar materials:
- nearest neighbors from materials table (vector similarity)

---

## 5) API / Backend
### Next.js routes (app router)
- POST /api/generate
  input: {use_case, sliders, weights?, constraints}
  output: {session_id, candidates[]}

- GET /api/session/:id
- GET /api/history?limit=20
- POST /api/optimize (takes session_id + candidate_id + objective)

### Supabase
- Use service role key server-side only
- RLS optional for MVP (can be off locally)

---

## 6) Seed Dataset (MVP)
Inserire almeno 25–40 materiali con metriche placeholder coerenti.
Includere: Lyocell, Modal, Viscose, Hemp, Linen, Organic Cotton, Recycled Cotton,
rPET, Bio-based elastane (placeholder), PLA fiber, PHA fiber, PA11, Wool (if allowed),
Silk (if allowed), Refibra/Tencel-like recycled MMCF.

Nota: valori reali possono essere placeholders iniziali; strutturare bene il DB per aggiornamento futuro.

---

## 7) Repo Structure
/ai-material-composer
  /app
    /(pages)
    /api
  /components
  /lib
    supabase.ts
    normalize.ts
    engine/
      generate.ts
      score.ts
      predict.ts
      rules.ts
  /db
    schema.sql
    seed.sql
  /tests
  README.md
  CODEx_TASK.md

---

## 8) Step-by-step Tasks for Codex (execute in order)
### Task 1 — Project bootstrap
- Create Next.js app (TypeScript)
- Install deps: supabase-js, zod, recharts
- Add basic layout + routing

### Task 2 — Supabase schema + seed
- Create SQL schema in /db/schema.sql
- Create /db/seed.sql with 30 materials
- Add scripts (package.json) to run migrations locally (or instructions)

### Task 3 — Engine
- Implement normalize.ts (map raw slider values to 0–100)
- Implement similarity (cosine) + scoring
- Implement blend generator (2–3 materials + additive)
- Implement predictor (weighted avg + synergy rules)
- Unit tests for engine (at least 6 tests)

### Task 4 — API routes
- POST /api/generate: runs engine, saves session + candidates, returns results
- GET /api/history: returns list
- GET /api/session/:id

### Task 5 — UI
- Composer screen with sliders + dropdown use_case + constraints toggles
- Results screen with cards + simple radar/bar charts
- History screen

### Task 6 — Optimization & Similar
- Add “Optimize” action (re-rank objective)
- Add “Find similar” (nearest neighbors query)

### Task 7 — QA
- Smoke e2e: load composer -> generate -> see results -> open history
- Ensure no secrets in client
- README with run instructions

---

## 9) Prompting (LLM)
LLM is used only to write explanation. It receives:
- candidates (composition + predicted metrics)
- and must produce:
  - short explanation (max 120 words)
  - manufacturing notes (bullets)
  - risks (bullets)
Rules:
- Do not create new numeric values
- Do not claim certifications unless present in input

---

## 10) Local Dev Commands (expected)
- npm install
- npm run dev
- npm test
- (optional) npm run db:setup

---

## 11) Acceptance Checklist (MVP)
- [ ] Generate returns consistent results for same input (deterministic seed)
- [ ] Candidates show composition + predicted metrics + impact
- [ ] History works
- [ ] No LLM numeric hallucinations (numbers from engine only)
- [ ] Minimal tests pass
