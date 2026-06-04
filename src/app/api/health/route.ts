import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, version: "baileys-1.0", build: process.env.NEXT_PUBLIC_BUILD_ID ?? "local" });
}
