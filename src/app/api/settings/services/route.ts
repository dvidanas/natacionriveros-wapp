import { NextResponse } from "next/server";
import { listServicesWithEnrollment, createService } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(listServicesWithEnrollment(true));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const id = createService({
    name: body.name.trim(),
    description: body.description?.trim() ?? null,
    days: body.days?.trim() ?? null,
    hours: body.hours?.trim() ?? null,
    price: body.price?.trim() ?? null,
    duration_minutes: Number(body.duration_minutes) || 60,
    teacher: body.teacher?.trim() ?? null,
    capacity: Number(body.capacity) || 10,
    active: 1,
  });
  return NextResponse.json({ id });
}
