import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getMaterialCatalog } from "@/lib/materials-db";
import { suggestMoreRecyclableAlternative } from "@/lib/engine/generate";

const inputSchema = z.object({
  use_case: z.string().min(1),
  sliders: z.record(z.string(), z.number()),
  weights: z.record(z.string(), z.number()).optional(),
  constraints: z
    .object({
      must_biodegradable: z.boolean().optional(),
      no_animal_fibers: z.boolean().optional(),
      max_microplastic_risk: z.enum(["low", "medium", "high"]).optional(),
      max_cost: z.number().optional()
    })
    .optional()
});

const bodySchema = z.object({
  input: inputSchema,
  candidate: z.any()
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const supabase = getSupabaseAdmin();
    const materials = await getMaterialCatalog(supabase);
    const alternative = suggestMoreRecyclableAlternative(body.input, body.candidate, materials);
    return NextResponse.json({ alternative });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
