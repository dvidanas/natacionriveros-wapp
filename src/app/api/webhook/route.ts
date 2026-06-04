import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Webhook no utilizado — WhatsApp se maneja directamente con Baileys.
export async function POST() {
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
