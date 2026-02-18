import { NextResponse } from "next/server";
import { rerankByObjective } from "@/lib/engine/generate";
import { optimizeSchema } from "@/lib/api-schemas";
import type { Candidate } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = optimizeSchema.parse(await req.json());
    const optimized = rerankByObjective(body.candidates as Candidate[], body.objective);
    return NextResponse.json({ candidates: optimized });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
