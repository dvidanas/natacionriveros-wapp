import { NextResponse } from "next/server";
import { getConnectionState } from "@/lib/baileys/client";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getConnectionState();
  let qrDataUrl: string | null = null;
  if (state.qr) {
    try {
      qrDataUrl = await QRCode.toDataURL(state.qr, { width: 300, margin: 2 });
    } catch {}
  }
  return NextResponse.json(
    { ...state, qr: qrDataUrl },
    { headers: { "Cache-Control": "no-store" } }
  );
}
