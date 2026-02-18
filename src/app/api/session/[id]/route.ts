import { NextResponse } from "next/server";
import { getLocalSessionById } from "@/lib/store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const local = getLocalSessionById(id);
  if (!local) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({ ...local, storage: "local-memory" });
}
