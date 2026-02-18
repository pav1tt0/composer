import type { Candidate, SessionInput } from "@/lib/types";
import { mapLegacyUseCaseId } from "@/lib/use-cases";

export type SessionRecord = {
  id: string;
  created_at: string;
  use_case: string;
  use_case_id?: string;
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
  return sessions.slice(0, limit).map((row) => ({
    ...row,
    use_case_id: row.use_case_id ?? mapLegacyUseCaseId(row.use_case)
  }));
}

export function getLocalSessionById(id: string): SessionRecord | null {
  const session = sessions.find((s) => s.id === id);
  if (!session) return null;
  return {
    ...session,
    use_case_id: session.use_case_id ?? mapLegacyUseCaseId(session.use_case)
  };
}
