import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getMaterialCatalog } from "@/lib/materials-db";
import { suggestMoreRecyclableAlternative } from "@/lib/engine/generate";
import { recyclableAlternativeBodySchema } from "@/lib/api-schemas";
import type { Candidate } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = recyclableAlternativeBodySchema.parse(await req.json());
    const supabase = getSupabaseAdmin();
    const materials = await getMaterialCatalog(supabase);
    const alternative = suggestMoreRecyclableAlternative(body.input, body.candidate as Candidate, materials);
    return NextResponse.json({ alternative });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
