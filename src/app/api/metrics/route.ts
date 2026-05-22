import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

export const dynamic = "force-dynamic";

function getDb(): Database.Database {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), "data", "messages.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath, { readonly: true });
  db.pragma("journal_mode = WAL");
  return db;
}

function monthBounds(offset = 0): { from: string; to: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offset;
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
    label: `${MONTHS[first.getMonth()]} ${first.getFullYear()}`,
  };
}

export async function GET() {
  const db = getDb();

  const cur = monthBounds(0);

  // ── Inscripciones del mes actual ───────────────────────────
  const statusRows = db
    .prepare<[string, string], { status: string; count: number }>(
      `SELECT status, COUNT(*) as count
       FROM appointments
       WHERE date >= ? AND date <= ?
       GROUP BY status`
    )
    .all(cur.from, cur.to);

  const statusMap = Object.fromEntries(statusRows.map((r) => [r.status, r.count]));
  const monthTotal = (statusMap.pending ?? 0) + (statusMap.confirmed ?? 0);
  const monthCancelled = statusMap.cancelled ?? 0;

  // Alumnos únicos este mes (por DNI si existe, si no por nombre)
  const uniqueRows = db
    .prepare<[string, string], { key: string }>(
      `SELECT COALESCE(NULLIF(TRIM(dni), ''), LOWER(TRIM(contact_name))) as key
       FROM appointments
       WHERE date >= ? AND date <= ? AND status != 'cancelled' AND key IS NOT NULL
       GROUP BY key`
    )
    .all(cur.from, cur.to);
  const uniqueStudents = uniqueRows.length;

  // Bot vs manual este mes
  const sourceRows = db
    .prepare<[string, string], { source: string; count: number }>(
      `SELECT source, COUNT(*) as count
       FROM appointments
       WHERE date >= ? AND date <= ? AND status != 'cancelled'
       GROUP BY source`
    )
    .all(cur.from, cur.to);
  const sourceMap = Object.fromEntries(sourceRows.map((r) => [r.source, r.count]));

  // ── Por disciplina este mes ────────────────────────────────
  const services = db
    .prepare<[], { id: number; name: string; capacity: number; active: number }>(
      `SELECT id, name, capacity, active FROM services ORDER BY name ASC`
    )
    .all();

  const byDiscipline = services.map((s) => {
    const rows = db
      .prepare<[string, string, string], { status: string; count: number }>(
        `SELECT status, COUNT(*) as count
         FROM appointments
         WHERE service = ? AND date >= ? AND date <= ?
         GROUP BY status`
      )
      .all(s.name, cur.from, cur.to);
    const sm = Object.fromEntries(rows.map((r) => [r.status, r.count]));
    const enrolled = (sm.pending ?? 0) + (sm.confirmed ?? 0);
    return {
      name: s.name,
      capacity: s.capacity,
      active: s.active,
      enrolled,
      confirmed: sm.confirmed ?? 0,
      pending: sm.pending ?? 0,
      cancelled: sm.cancelled ?? 0,
    };
  });

  // ── Historial últimos 6 meses ─────────────────────────────
  const monthly = [];
  for (let i = -5; i <= 0; i++) {
    const bounds = monthBounds(i);
    const rows = db
      .prepare<[string, string], { status: string; count: number }>(
        `SELECT status, COUNT(*) as count
         FROM appointments
         WHERE date >= ? AND date <= ?
         GROUP BY status`
      )
      .all(bounds.from, bounds.to);
    const sm = Object.fromEntries(rows.map((r) => [r.status, r.count]));
    monthly.push({
      label: bounds.label,
      total: (sm.pending ?? 0) + (sm.confirmed ?? 0),
      confirmed: sm.confirmed ?? 0,
      pending: sm.pending ?? 0,
      cancelled: sm.cancelled ?? 0,
    });
  }

  // ── Conversaciones y mensajes ──────────────────────────────
  const totalConversations = (db
    .prepare<[], { count: number }>("SELECT COUNT(*) as count FROM conversations")
    .get())!.count;

  const msgRows = db
    .prepare<[], { role: string; count: number }>(
      "SELECT role, COUNT(*) as count FROM messages GROUP BY role"
    )
    .all();
  const msgMap = Object.fromEntries(msgRows.map((r) => [r.role, r.count]));
  const aiMessages = msgMap.assistant ?? 0;
  const humanMessages = (msgMap.human ?? 0) + (msgMap.user ?? 0);

  // Leads del mes
  const monthLeads = (db
    .prepare<[string, string], { count: number }>(
      `SELECT COUNT(*) as count FROM leads
       WHERE created_at >= unixepoch(?) AND created_at <= unixepoch(?)`
    )
    .get(cur.from, cur.to + " 23:59:59"))!.count;

  db.close();

  return NextResponse.json({
    month: cur.label,
    current: {
      total: monthTotal,
      confirmed: statusMap.confirmed ?? 0,
      pending: statusMap.pending ?? 0,
      cancelled: monthCancelled,
      uniqueStudents,
      fromBot: sourceMap.bot ?? 0,
      fromManual: sourceMap.manual ?? 0,
    },
    byDiscipline,
    monthly,
    conversations: {
      total: totalConversations,
      aiMessages,
      humanMessages,
      monthLeads,
    },
  });
}
