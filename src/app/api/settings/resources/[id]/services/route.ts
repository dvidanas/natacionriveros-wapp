import { NextResponse } from "next/server";
import { getServicesForResource, setServicesForResource } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(getServicesForResource(Number(id)));
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (!Array.isArray(body.service_ids)) {
    return NextResponse.json({ error: "service_ids required" }, { status: 400 });
  }
  setServicesForResource(Number(id), body.service_ids.map(Number));
  return NextResponse.json({ ok: true });
}
