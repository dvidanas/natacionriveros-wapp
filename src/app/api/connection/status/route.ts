import { NextResponse } from "next/server";
import { getConnectionState } from "@/lib/baileys/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getConnectionState();
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store" },
  });
}
