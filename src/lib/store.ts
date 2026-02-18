import type { Candidate, SessionInput } from "@/lib/types";

export type SessionRecord = {
  id: string;
  created_at: string;
  use_case: string;
  sliders: SessionInput["sliders"];
  constraints: SessionInput["constraints"];
  candidates: Candidate[];
};

const sessions: SessionRecord[] = [];

export function saveLocalSession(record: SessionRecord): void {
  sessions.unshift(record);
  if (sessions.length > 50) sessions.length = 50;
}

export function getLocalHistory(limit = 20): SessionRecord[] {
  return sessions.slice(0, limit);
}

export function getLocalSessionById(id: string): SessionRecord | null {
  return sessions.find((s) => s.id === id) ?? null;
}
