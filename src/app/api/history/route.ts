import { NextRequest, NextResponse } from "next/server";
import { getLocalHistory } from "@/lib/store";

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  return NextResponse.json({ sessions: getLocalHistory(limit), storage: "local-memory" });
}
