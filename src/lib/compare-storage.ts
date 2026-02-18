import type { Candidate } from "@/lib/types";

export function parseStoredCandidates(raw: string | null): Candidate[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Candidate[];
  } catch {
    return [];
  }
}
