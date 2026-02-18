create extension if not exists "uuid-ossp";

create table if not exists materials (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  properties_json jsonb not null,
  lca_json jsonb not null,
  constraints_json jsonb not null,
  min_cost numeric,
  max_cost numeric,
  trl int,
  sources jsonb default '[]'::jsonb
);

create table if not exists generation_sessions (
  id text primary key,
  created_at timestamptz not null default now(),
  use_case text not null,
  sliders_json jsonb not null,
  constraints_json jsonb not null default '{}'::jsonb,
  user_id uuid
);

create table if not exists generation_candidates (
  id text primary key,
  session_id text not null references generation_sessions(id) on delete cascade,
  rank int not null,
  composition_json jsonb not null,
  process_json jsonb,
  predicted_properties_json jsonb not null,
  predicted_lca_json jsonb not null,
  feasibility_json jsonb not null,
  circularity_json jsonb not null default '{}'::jsonb,
  explanation text
);

create table if not exists favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  candidate_id text references generation_candidates(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_generation_sessions_created_at on generation_sessions(created_at desc);
create index if not exists idx_generation_candidates_session on generation_candidates(session_id);
