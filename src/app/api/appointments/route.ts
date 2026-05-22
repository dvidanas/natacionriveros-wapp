import { NextRequest, NextResponse } from "next/server";
import {
  listAppointments,
  createAppointment,
  getAppointmentStats,
  listResources,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? from;

  const appointments = listAppointments(from, to);
  const stats = getAppointmentStats();
  const resources = listResources();

  return NextResponse.json({ appointments, stats, resources });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Batch enrollment mode: persons[] each with their own services[], + contact_phone + date
  if (Array.isArray(body.persons)) {
    const { persons, contact_phone, date, notes, resource_id } = body;
    if (!date) {
      return NextResponse.json({ error: "Se requiere la fecha" }, { status: 400 });
    }

    let rid = resource_id ? Number(resource_id) : 0;
    if (!rid) {
      const first = listResources()[0];
      if (!first) return NextResponse.json({ error: "No hay personal activo" }, { status: 400 });
      rid = first.id;
    }

    const ids: number[] = [];
    for (const person of persons as Array<{ name: string; dni?: string; services?: string[] }>) {
      const personServices = Array.isArray(person.services) ? person.services : [];
      for (const svc of personServices) {
        const id = createAppointment({
          resource_id: rid,
          service: svc,
          date: date as string,
          time_start: "00:00",
          duration_minutes: 0,
          contact_name: person.name || null,
          contact_phone: typeof contact_phone === "string" ? contact_phone : null,
          dni: person.dni || null,
          notes: typeof notes === "string" ? notes : null,
          source: "manual",
        });
        ids.push(id);
      }
    }
    return NextResponse.json({ ids }, { status: 201 });
  }

  // Single appointment mode (used by bot and legacy)
  const { resource_id, date, time_start, duration_minutes, service, notes, contact_name, contact_phone, conversation_id, dni } = body;

  if (!resource_id || !date || !time_start || !duration_minutes) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const id = createAppointment({
    resource_id: Number(resource_id),
    conversation_id: conversation_id ? Number(conversation_id) : null,
    service: typeof service === "string" ? service : null,
    date: date as string,
    time_start: time_start as string,
    duration_minutes: Number(duration_minutes),
    notes: typeof notes === "string" ? notes : null,
    contact_name: typeof contact_name === "string" ? contact_name : null,
    contact_phone: typeof contact_phone === "string" ? contact_phone : null,
    dni: typeof dni === "string" ? dni : null,
    source: "manual",
  });

  return NextResponse.json({ id }, { status: 201 });
}
