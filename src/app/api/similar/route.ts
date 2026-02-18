import { NextResponse } from "next/server";
import { z } from "zod";
import { findSimilarMaterialsFromCatalog } from "@/lib/engine/generate";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getMaterialCatalog } from "@/lib/materials-db";

const similarSchema = z.object({
  material_id: z.string().min(1),
  limit: z.number().int().min(1).max(10).optional()
});

export async function POST(req: Request) {
  try {
    const body = similarSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();
    const materials = await getMaterialCatalog(supabase);
    const similar = findSimilarMaterialsFromCatalog(materials, body.material_id, body.limit ?? 5);
    return NextResponse.json({ materials: similar });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
