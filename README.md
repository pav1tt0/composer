# AI Material Composer (MVP)

Next.js app that generates material blend candidates from slider targets and constraints.
The Composer uses an intelligent use-case profile system (grouped/searchable selector) that influences ranking and constraints.

## Stack
- Next.js (App Router, TypeScript)
- Supabase (optional in local; service role only server-side)
- Engine: rule-based + similarity + deterministic seeding
- Charts: Recharts

## Run
1. `npm install`
2. `npm run dev`
3. open `http://localhost:3000`

## Tests
- `npm test`
- `npm run test:unit`
- `npm run test:smoke`

## Database
- Schema: `db/schema.sql`
- Seed: `db/seed.sql`
- Local helper: `npm run db:setup`

If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are missing, API uses local seed materials.
If Supabase is configured, `/api/generate` and `/api/similar` read catalog from your materials table.
Current mode is read-only on Supabase: no write queries are executed.
Optional env for custom schema/table names:
- `SUPABASE_READ_ONLY` (default `true`)
- `SUPABASE_DB_SCHEMA` (default `public`)
- `SUPABASE_MATERIALS_TABLE` (default `materials`)
Supported schemas:
- normalized schema: `id`, `name`, `category`, `properties_json`, `lca_json`, `constraints_json`, `min_cost`, `max_cost`, `trl`
- sustaid schema: `material_id`, `material_name`, `category`, `sustainability_score`, `ghg_emissions`, `water_consumption`, `energy_use`, `biodegradability`, `durability`, `tensile_strength`, `moisture_absorption`, `temperature_resistance`, `elasticity`, `dyeability`, `comfort_level`, `cost_range`, `primary_applications`, `sustainability_rating`

## API
- `POST /api/generate`
- `GET /api/history?limit=20`
- `GET /api/session/:id`
- `POST /api/optimize`
- `POST /api/similar`

Note: in read-only mode `history` and `session` are in-memory for the current server run.

`POST /api/generate` accepts:
- `use_case_id` (new, preferred; config-driven)
- `use_case` (legacy label, still supported and mapped to `use_case_id`)
