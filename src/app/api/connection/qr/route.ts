import { NextResponse } from "next/server";
import { getConnectionState } from "@/lib/baileys/client";
import qrcode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET() {
  const { status, qr } = getConnectionState();

  if (status !== "qr" || !qr) {
    return NextResponse.json({ error: "No hay QR disponible" }, { status: 404 });
  }

  try {
    const dataUrl = await qrcode.toDataURL(qr, { width: 300, margin: 2 });
    return NextResponse.json({ qr: dataUrl });
  } catch {
    return NextResponse.json({ error: "Error generando QR" }, { status: 500 });
  }
}
