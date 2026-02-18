import { NextResponse } from "next/server";
import { z } from "zod";
import { rerankByObjective } from "@/lib/engine/generate";

const optimizeSchema = z.object({
  objective: z.enum(["min_co2", "min_cost", "max_durability"]),
  candidates: z.array(z.any())
});

export async function POST(req: Request) {
  try {
    const body = optimizeSchema.parse(await req.json());
    const optimized = rerankByObjective(body.candidates, body.objective);
    return NextResponse.json({ candidates: optimized });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
