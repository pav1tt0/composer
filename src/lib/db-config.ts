export const DB_SCHEMA = process.env.SUPABASE_DB_SCHEMA || "public";
export const SUPABASE_READ_ONLY = (process.env.SUPABASE_READ_ONLY || "true").toLowerCase() === "true";

export const TABLES = {
  materials: process.env.SUPABASE_MATERIALS_TABLE || "materials",
  sessions: process.env.SUPABASE_SESSIONS_TABLE || "generation_sessions",
  candidates: process.env.SUPABASE_CANDIDATES_TABLE || "generation_candidates"
} as const;
