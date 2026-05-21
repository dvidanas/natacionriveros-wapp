import { NextRequest, NextResponse } from "next/server";
import { updateAppointmentStatus, deleteAppointment } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await params;
  const id = Number(appointmentId);
  if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const validStatuses = ["pending", "confirmed", "cancelled"];
  if (!body.status || !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  updateAppointmentStatus(id, body.status as "pending" | "confirmed" | "cancelled");
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await params;
  const id = Number(appointmentId);
  if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  deleteAppointment(id);
  return NextResponse.json({ ok: true });
}
