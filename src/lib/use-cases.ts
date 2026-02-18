import { DEFAULT_USE_CASE_ID, USE_CASES, USE_CASES_BY_ID } from "@/lib/config/useCases";
import type { UseCaseCategory, UseCaseConfig } from "@/lib/types/useCase";

const legacyMap: Record<string, string> = {
  sportswear: "sportswear",
  denim: "denim",
  luxury: "luxury-fashion",
  interior: "upholstery",
  cycling: "cycling-apparel",
  outdoor: "outdoor-technical",
  running: "running-apparel",
  knitwear: "knitwear",
  workwear: "workwear",
  circular: "circular-design"
};

const idAliasMap: Record<string, string> = {
  "denim-dailywear": "denim",
  "luxury-soft-touch": "luxury-fashion",
  "upholstery-interior": "upholstery",
  "workwear-durability": "workwear",
  "outdoor-technical-shell": "outdoor-technical",
  "circular-min-microplastic": "circular-design",
  "cost-optimized-basics": "fast-fashion"
};

function normalizeLegacyKey(value: string): string {
  return value.trim().toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
}

export function mapLegacyUseCaseId(raw: string | undefined | null): string {
  if (!raw) return DEFAULT_USE_CASE_ID;
  const normalized = normalizeLegacyKey(raw);
  return legacyMap[normalized] ?? DEFAULT_USE_CASE_ID;
}

export function resolveUseCaseId(payload: { use_case_id?: string; use_case?: string }): string {
  if (payload.use_case_id) {
    if (USE_CASES_BY_ID.has(payload.use_case_id)) return payload.use_case_id;
    const aliased = idAliasMap[payload.use_case_id];
    if (aliased && USE_CASES_BY_ID.has(aliased)) return aliased;
  }
  return mapLegacyUseCaseId(payload.use_case);
}

export function getUseCaseById(id: string | undefined | null): UseCaseConfig {
  if (!id) return USE_CASES_BY_ID.get(DEFAULT_USE_CASE_ID)!;
  return USE_CASES_BY_ID.get(id) ?? USE_CASES_BY_ID.get(DEFAULT_USE_CASE_ID)!;
}

function normalize(text: string): string {
  return text.toLowerCase().replaceAll("-", " ").replaceAll("_", " ").trim();
}

export function getUseCaseGroups(options?: {
  query?: string;
  category?: UseCaseCategory | "ALL";
}): Array<{ category: string; items: UseCaseConfig[] }> {
  const q = normalize(options?.query ?? "");
  const category = options?.category ?? "ALL";

  const filtered = USE_CASES.filter((uc) => {
    if (category !== "ALL" && uc.category !== category) return false;
    if (!q) return true;

    const haystack = normalize([uc.label, uc.id, uc.category, uc.description].join(" "));
    return haystack.includes(q);
  });

  const groups = new Map<string, UseCaseConfig[]>();
  for (const useCase of filtered) {
    const arr = groups.get(useCase.category) ?? [];
    arr.push(useCase);
    groups.set(useCase.category, arr);
  }

  return [...groups.entries()].map(([category, items]) => ({ category, items }));
}
