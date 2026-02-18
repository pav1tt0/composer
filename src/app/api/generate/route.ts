import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCandidates } from "@/lib/engine/generate";
import { getSupabaseAdmin } from "@/lib/supabase";
import { makeId } from "@/lib/id";
import { saveLocalSession } from "@/lib/store";
import { getMaterialCatalog } from "@/lib/materials-db";
import { resolveUseCaseId, getUseCaseById } from "@/lib/use-cases";

const payloadSchema = z
  .object({
  use_case: z.string().min(1).optional(),
  use_case_id: z.string().min(1).optional(),
  sliders: z
    .record(
      z.string(),
      z.preprocess((v) => (Number.isFinite(Number(v)) ? Number(v) : 50), z.number().min(0).max(100))
    )
    .default({}),
  weights: z
    .record(
      z.string(),
      z.preprocess((v) => (Number.isFinite(Number(v)) ? Number(v) : 1), z.number().positive())
    )
    .optional(),
  constraints: z
    .object({
      must_biodegradable: z.boolean().optional(),
      no_animal_fibers: z.boolean().optional(),
      max_microplastic_risk: z.enum(["low", "medium", "high"]).optional(),
      max_cost: z.preprocess((v) => (Number.isFinite(Number(v)) ? Number(v) : undefined), z.number().optional())
    })
    .optional()
})
  .refine((value) => Boolean(value.use_case_id || value.use_case), {
    message: "use_case or use_case_id is required"
  });

export async function POST(req: Request) {
  try {
    const body = payloadSchema.parse(await req.json());
    const useCaseId = resolveUseCaseId(body);
    const useCase = getUseCaseById(useCaseId);
    const supabase = getSupabaseAdmin();
    const materials = await getMaterialCatalog(supabase);
    const candidates = generateCandidates({ ...body, use_case: useCase.label, use_case_id: useCase.id }, materials);
    const sessionId = makeId();
    const createdAt = new Date().toISOString();

    saveLocalSession({
      id: sessionId,
      created_at: createdAt,
      use_case: useCase.label,
      use_case_id: useCase.id,
      sliders: body.sliders,
      constraints: body.constraints,
      candidates
    });

    return NextResponse.json({ session_id: sessionId, use_case_id: useCase.id, candidates, storage: "local-memory" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
