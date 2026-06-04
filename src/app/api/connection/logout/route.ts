import { NextResponse } from "next/server";
import { logout } from "@/lib/baileys/client";

export async function POST() {
  await logout();
  return NextResponse.json({ ok: true });
}
