"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { TopNav, BottomNav } from "@/components/TopNav";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PullToRefresh } from "@/components/PullToRefresh";

interface Enrollment {
  id: number;
  resource_id: number;
  resource_name: string;
  conversation_id: number | null;
  service: string | null;
  date: string;
  time_start: string;
  time_end: string;
  duration_minutes: number;
  status: "pending" | "confirmed" | "cancelled";
  source: "manual" | "bot";
  notes: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  dni: string | null;
  created_at: number;
}

interface Resource {
  id: number;
  name: string;
  active: number;
}

interface ServiceOption {
  id: number;
  name: string;
  capacity: number;
  enrolled: number;
}

interface Stats {
  pending: number;
  confirmed: number;
  cancelled: number;
}

const STATUS_LABELS = { pending: "Pendiente", confirmed: "Confirmado", cancelled: "Cancelado" };

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getMonthBounds(date: Date): { from: string; to: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  return {
    from: dateToStr(new Date(y, m, 1)),
    to: dateToStr(new Date(y, m + 1, 0)),
  };
}

function formatEnrollDate(str: string): string {
  const d = new Date(str + "T12:00:00Z");
  return `${d.getUTCDate()} de ${MONTH_NAMES[d.getUTCMonth()].toLowerCase()} ${d.getUTCFullYear()}`;
}

// ── Enrollment Card ──────────────────────────────────────────

function EnrollmentCard({
  e,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  e: Enrollment;
  onStatusChange: (id: number, status: Enrollment["status"]) => void;
  onDelete: (id: number) => void;
  onEdit: (e: Enrollment) => void;
}) {
  const name = e.contact_name ?? "Sin nombre";
  const accentColor =
    e.status === "pending" ? "#F59E0B" : e.status === "confirmed" ? "#2DD4BF" : "var(--color-wa-sep)";

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "?";

  return (
    <div
      className={`relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-5 rounded-2xl border border-[var(--color-wa-sep)] bg-[var(--color-wa-panel-l)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 overflow-hidden ${
        e.status === "cancelled" ? "opacity-60" : ""
      }`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r-md" style={{ backgroundColor: accentColor }} />

      {/* Left: avatar + info */}
      <div className="flex items-center gap-3.5 min-w-0 pl-1.5 md:pl-2.5 flex-1">
        <div
          className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner select-none"
          style={{
            background:
              e.status === "cancelled"
                ? "var(--color-wa-sep)"
                : e.status === "pending"
                ? "linear-gradient(135deg, #FBBF24, #F59E0B)"
                : "linear-gradient(135deg, #2DD4BF, #0D9488)",
          }}
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-[var(--color-wa-text-main)] leading-tight">{name}</h3>
            {e.dni && (
              <span className="text-xs bg-slate-100 dark:bg-slate-800 text-[var(--color-wa-text-sec)] px-2 py-0.5 rounded-full font-mono">
                DNI {e.dni}
              </span>
            )}
          </div>

          {e.service && (
            <p className="text-sm font-semibold text-[var(--color-wa-green)] mt-0.5 truncate">{e.service}</p>
          )}

          <div className="flex flex-wrap items-center gap-y-1 gap-x-2 mt-1.5 text-xs text-[var(--color-wa-text-sec)]">
            <span
              className={`font-bold ${
                e.status === "confirmed"
                  ? "text-teal-500"
                  : e.status === "pending"
                  ? "text-amber-500"
                  : "text-red-400"
              }`}
            >
              {STATUS_LABELS[e.status]}
            </span>

            <span className="opacity-40">·</span>
            <span>{formatEnrollDate(e.date)}</span>

            {e.source === "bot" && (
              <>
                <span className="opacity-40">·</span>
                <span className="text-slate-400">Bot</span>
              </>
            )}

            {e.contact_phone && (
              <>
                <span className="opacity-40">·</span>
                <a
                  href={`tel:${e.contact_phone}`}
                  className="hover:text-[var(--color-wa-green-dark)] transition-colors"
                >
                  {e.contact_phone}
                </a>
              </>
            )}
          </div>

          {e.notes && (
            <p className="mt-1.5 text-xs italic text-[var(--color-wa-text-sec)] line-clamp-1">"{e.notes}"</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between md:justify-end border-t md:border-t-0 border-[var(--color-wa-sep)] pt-3 md:pt-0 mt-1 md:mt-0 gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {e.status === "pending" && (
            <button
              onClick={() => onStatusChange(e.id, "confirmed")}
              className="text-xs px-3 py-1.5 bg-teal-500 text-white rounded-full font-semibold hover:bg-teal-600 active:scale-95 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Confirmar
            </button>
          )}
          {e.status === "confirmed" && (
            <button
              onClick={() => onStatusChange(e.id, "cancelled")}
              className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 active:scale-95 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
          )}
          {e.status === "pending" && (
            <button
              onClick={() => onStatusChange(e.id, "cancelled")}
              className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 active:scale-95 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Rechazar
            </button>
          )}
          {e.status === "cancelled" && (
            <button
              onClick={() => onStatusChange(e.id, "pending")}
              className="text-xs px-3 py-1.5 border border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] rounded-full font-semibold hover:bg-[var(--color-wa-hover)] active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2" />
              </svg>
              Reactivar
            </button>
          )}

          <button
            onClick={() => onEdit(e)}
            className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-full font-semibold hover:bg-amber-600 active:scale-95 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </button>

          {e.conversation_id !== null && (
            <Link
              href={`/?id=${e.conversation_id}`}
              className="text-xs px-3 py-1.5 rounded-full border border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white active:scale-95 transition-all flex items-center gap-1 font-semibold"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              WA
            </Link>
          )}
        </div>

        <button
          onClick={() => onDelete(e.id)}
          className="text-xs p-2 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-90 transition-all cursor-pointer flex-shrink-0"
          title="Eliminar inscripción"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function InscripcionesPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, confirmed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [disciplineFilter, setDisciplineFilter] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);
  const [savingModal, setSavingModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // New enrollment form
  const [modalDate, setModalDate] = useState(() => dateToStr(new Date()));
  const [modalPhone, setModalPhone] = useState("");
  const [modalPersons, setModalPersons] = useState<{ name: string; dni: string; services: string[] }[]>([{ name: "", dni: "", services: [] }]);
  const [modalNotes, setModalNotes] = useState("");

  // Edit form
  const [editName, setEditName] = useState("");
  const [editDni, setEditDni] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editService, setEditService] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDate, setEditDate] = useState("");

  const { from, to } = useMemo(() => getMonthBounds(currentMonth), [currentMonth]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/appointments?from=${from}&to=${to}`);
      if (res.ok) {
        const data = await res.json();
        setEnrollments(data.appointments ?? []);
        setStats(data.stats ?? { pending: 0, confirmed: 0, cancelled: 0 });
        setResources(data.resources ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [currentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    fetch("/api/settings/services")
      .then((r) => r.json())
      .then((data: ServiceOption[]) => setServices(data.filter((s) => s.enrolled !== undefined)));
  }, []);

  // Count enrollments per discipline (all statuses) in the current month view
  const disciplineCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of enrollments) {
      if (e.service) counts[e.service] = (counts[e.service] || 0) + 1;
    }
    return counts;
  }, [enrollments]);

  async function changeStatus(id: number, status: Enrollment["status"]) {
    setEnrollments((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    await fetch(`/api/appointments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    setEnrollments((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/appointments/${id}/status`, { method: "DELETE" });
  }

  function openNewModal() {
    setEditingEnrollment(null);
    setModalDate(dateToStr(new Date()));
    setModalPhone("");
    setModalPersons([{ name: "", dni: "", services: [] }]);
    setModalNotes("");
    setShowModal(true);
  }

  function openEditModal(e: Enrollment) {
    setEditingEnrollment(e);
    setEditName(e.contact_name ?? "");
    setEditDni(e.dni ?? "");
    setEditPhone(e.contact_phone ?? "");
    setEditService(e.service ?? "");
    setEditNotes(e.notes ?? "");
    setEditDate(e.date);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingEnrollment(null);
  }

  function togglePersonService(personIdx: number, svcName: string) {
    setModalPersons((prev) =>
      prev.map((p, i) =>
        i === personIdx
          ? { ...p, services: p.services.includes(svcName) ? p.services.filter((s) => s !== svcName) : [...p.services, svcName] }
          : p
      )
    );
  }

  function addPerson() {
    setModalPersons((prev) => [...prev, { name: "", dni: "", services: [] }]);
  }

  function removePerson(i: number) {
    setModalPersons((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updatePerson(i: number, field: "name" | "dni", value: string) {
    setModalPersons((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }

  async function saveNew() {
    const validPersons = modalPersons.filter((p) => p.name.trim() && p.services.length > 0);
    if (validPersons.length === 0) return;
    setSavingModal(true);
    try {
      const rid = resources[0]?.id;
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persons: validPersons,
          contact_phone: modalPhone || null,
          date: modalDate,
          notes: modalNotes || null,
          resource_id: rid ?? undefined,
        }),
      });
      if (res.ok) {
        closeModal();
        fetchData();
      }
    } finally {
      setSavingModal(false);
    }
  }

  async function saveEdit() {
    if (!editingEnrollment) return;
    setSavingModal(true);
    try {
      const res = await fetch(`/api/appointments/${editingEnrollment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_id: editingEnrollment.resource_id,
          date: editDate,
          time_start: editingEnrollment.time_start || "00:00",
          duration_minutes: editingEnrollment.duration_minutes || 0,
          service: editService || null,
          contact_name: editName || null,
          contact_phone: editPhone || null,
          dni: editDni || null,
          notes: editNotes || null,
        }),
      });
      if (res.ok) {
        closeModal();
        fetchData();
      }
    } finally {
      setSavingModal(false);
    }
  }

  const prevMonth = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const filtered = useMemo(() => {
    let list = filter === "all" ? enrollments : enrollments.filter((e) => e.status === filter);
    if (disciplineFilter) list = list.filter((e) => e.service === disciplineFilter);
    return list;
  }, [enrollments, filter, disciplineFilter]);

  const inputCls =
    "w-full text-sm bg-[var(--color-wa-input)] border border-[var(--color-wa-sep)] rounded-lg px-3 py-2.5 text-[var(--color-wa-text-main)] focus:outline-none focus:border-[var(--color-wa-green)] placeholder:text-[var(--color-wa-text-sec)]";

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-wa-bg-main)]">
      <TopNav />

      <div className="flex-1 flex min-h-0 md:p-3 md:gap-3 overflow-hidden">

        {/* ── Left sidebar ── */}
        <aside
          className="hidden md:flex w-[350px] flex-shrink-0 flex-col bg-[var(--color-wa-panel-l)] md:rounded-2xl overflow-hidden border border-[var(--color-wa-sep)]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {/* Sidebar header */}
          <div className="px-4 pt-4 pb-3 flex-shrink-0 border-b border-[var(--color-wa-sep)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-[var(--color-wa-text-sec)]">
                Disciplinas
              </span>
              <span className="text-xs text-[var(--color-wa-text-sec)]">
                {MONTH_NAMES[currentMonth.getMonth()]}
              </span>
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1">
            {/* All */}
            <li>
              <button
                onClick={() => setDisciplineFilter(null)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-left ${
                  disciplineFilter === null
                    ? "bg-[var(--color-wa-green)]/10"
                    : "hover:bg-[var(--color-wa-hover)]"
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-[var(--color-wa-green)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-wa-text-main)]">Todas las disciplinas</p>
                  <p className="text-xs text-[var(--color-wa-text-sec)]">
                    {enrollments.length} inscripción{enrollments.length !== 1 ? "es" : ""} este mes
                  </p>
                </div>
                {disciplineFilter === null && (
                  <svg className="w-4 h-4 text-[var(--color-wa-green)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </li>

            {services.length > 0 && (
              <li className="px-3 pt-2 pb-1">
                <div className="border-t border-[var(--color-wa-sep)]" />
              </li>
            )}

            {services.map((s) => {
              const monthCount = disciplineCount[s.name] ?? 0;
              const isFull = s.enrolled >= s.capacity;
              const isSelected = disciplineFilter === s.name;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setDisciplineFilter(isSelected ? null : s.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-left ${
                      isSelected
                        ? "bg-[var(--color-wa-green)]/10"
                        : "hover:bg-[var(--color-wa-hover)]"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isFull ? "bg-red-400" : monthCount > 0 ? "bg-[var(--color-wa-green)]" : "bg-[var(--color-wa-sep)]"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-wa-text-main)] truncate">{s.name}</p>
                      <p
                        className={`text-xs font-semibold ${
                          isFull ? "text-red-500" : "text-[var(--color-wa-green)]"
                        }`}
                      >
                        {isFull ? "Cupo lleno" : `${s.enrolled}/${s.capacity} inscriptos`}
                      </p>
                      {monthCount > 0 && (
                        <p className="text-xs text-[var(--color-wa-text-sec)]">
                          {monthCount} este mes
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <svg className="w-4 h-4 text-[var(--color-wa-green)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}

            {services.length === 0 && (
              <li className="px-3 py-3 text-sm text-[var(--color-wa-text-sec)]">Sin disciplinas activas.</li>
            )}
          </ul>
        </aside>

        {/* ── Main panel ── */}
        <main
          className="flex-1 min-w-0 flex flex-col bg-[var(--color-wa-panel-l)] md:rounded-2xl overflow-hidden border-r md:border border-[var(--color-wa-sep)]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {/* Panel header */}
          <div className="px-4 md:px-6 py-3 flex items-center justify-between border-b border-[var(--color-wa-sep)] flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-wa-text-main)]">
                {disciplineFilter ?? "Inscripciones"}
              </h2>
              <p className="text-xs text-[var(--color-wa-text-sec)]">
                {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                {disciplineFilter && ` · ${filtered.length} inscripto${filtered.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] text-sm font-semibold rounded-xl hover:bg-[var(--color-wa-green-dark)] transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nueva
            </button>
          </div>

          <PullToRefresh onRefresh={fetchData} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 md:px-6 py-4 space-y-3">

                {/* Month nav + stats */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={prevMonth}
                      className="p-1.5 rounded-lg hover:bg-[var(--color-wa-hover)] transition-colors"
                    >
                      <svg className="w-4 h-4 text-[var(--color-wa-text-sec)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextMonth}
                      className="p-1.5 rounded-lg hover:bg-[var(--color-wa-hover)] transition-colors"
                    >
                      <svg className="w-4 h-4 text-[var(--color-wa-text-sec)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-[var(--color-wa-text-sec)]">Pendientes</span>
                      <span className="font-bold text-[var(--color-wa-text-main)]">{stats.pending}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-teal-400" />
                      <span className="text-[var(--color-wa-text-sec)]">Confirmadas</span>
                      <span className="font-bold text-[var(--color-wa-text-main)]">{stats.confirmed}</span>
                    </span>
                  </div>
                </div>

                {/* Filter chips: status + mobile discipline */}
                <div className="flex gap-2 flex-wrap">
                  {(["all", "pending", "confirmed", "cancelled"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
                        filter === f
                          ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)]"
                          : "bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)]"
                      }`}
                    >
                      {f === "all" ? "Todas" : STATUS_LABELS[f]}
                    </button>
                  ))}

                  {/* Discipline chips — visible only on mobile */}
                  {services.length > 0 && (
                    <>
                      <div className="md:hidden w-px bg-[var(--color-wa-sep)] self-stretch mx-0.5" />
                      {services.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setDisciplineFilter(disciplineFilter === s.name ? null : s.name)}
                          className={`md:hidden text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
                            disciplineFilter === s.name
                              ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)]"
                              : "bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)]"
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </>
                  )}
                </div>

                {/* List */}
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 rounded-2xl bg-[var(--color-wa-sep)] animate-pulse" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <svg className="w-12 h-12 text-[var(--color-wa-text-sec)] opacity-20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-base text-[var(--color-wa-text-sec)]">
                      {disciplineFilter
                        ? `Sin inscripciones en ${disciplineFilter} este mes`
                        : "Sin inscripciones este mes"}
                    </p>
                    <button
                      onClick={openNewModal}
                      className="mt-3 text-sm text-[var(--color-wa-green)] font-semibold hover:underline"
                    >
                      + Nueva inscripción
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 pb-4">
                    {filtered.map((e) => (
                      <EnrollmentCard
                        key={e.id}
                        e={e}
                        onStatusChange={changeStatus}
                        onDelete={setDeleteId}
                        onEdit={openEditModal}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </PullToRefresh>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-wa-panel-l)] rounded-2xl w-full max-w-sm shadow-2xl animate-modal flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-wa-sep)] flex-shrink-0">
              <h2 className="text-base font-semibold text-[var(--color-wa-text-main)]">
                {editingEnrollment ? "Editar inscripción" : "Nueva inscripción"}
              </h2>
              <button type="button" onClick={closeModal} className="text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {editingEnrollment ? (
                // ── Edit form ──
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Fecha</label>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Nombre</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre completo" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">DNI</label>
                    <input type="text" value={editDni} onChange={(e) => setEditDni(e.target.value)} placeholder="12345678" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Teléfono</label>
                    <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+54 9..." className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Disciplina</label>
                    <input type="text" value={editService} onChange={(e) => setEditService(e.target.value)} placeholder="Ej: Natación Adultos" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Notas (opcional)</label>
                    <textarea rows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notas internas..." className={`${inputCls} resize-none`} />
                  </div>
                </>
              ) : (
                // ── New enrollment form ──
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Fecha de inscripción</label>
                    <input type="date" value={modalDate} onChange={(e) => setModalDate(e.target.value)} className={inputCls} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Teléfono de contacto</label>
                    <input type="tel" value={modalPhone} onChange={(e) => setModalPhone(e.target.value)} placeholder="+54 9..." className={inputCls} />
                  </div>

                  {/* Persons */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-[var(--color-wa-text-sec)]">
                        Inscriptos
                      </label>
                      <button
                        type="button"
                        onClick={addPerson}
                        className="text-xs text-[var(--color-wa-green)] font-semibold hover:underline"
                      >
                        + Agregar persona
                      </button>
                    </div>
                    <div className="space-y-3">
                      {modalPersons.map((p, i) => (
                        <div key={i} className="rounded-xl border border-[var(--color-wa-sep)] p-3 space-y-2 relative">
                          {modalPersons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePerson(i)}
                              className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => updatePerson(i, "name", e.target.value)}
                            placeholder="Nombre completo"
                            className={inputCls}
                          />
                          <input
                            type="text"
                            value={p.dni}
                            onChange={(e) => updatePerson(i, "dni", e.target.value)}
                            placeholder="DNI"
                            className={inputCls}
                          />
                          {/* Per-person discipline selector */}
                          <div>
                            <p className="text-xs text-[var(--color-wa-text-sec)] mb-1.5 font-medium">
                              Disciplina
                              {p.services.length > 0 && (
                                <span className="ml-1.5 text-[var(--color-wa-green)]">
                                  {p.services.join(", ")}
                                </span>
                              )}
                            </p>
                            {services.length === 0 ? (
                              <p className="text-xs text-[var(--color-wa-text-sec)] italic">Sin disciplinas activas</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {services.map((s) => {
                                  const selected = p.services.includes(s.name);
                                  const full = s.enrolled >= s.capacity;
                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => !full && togglePersonService(i, s.name)}
                                      disabled={full && !selected}
                                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                                        selected
                                          ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] border-[var(--color-wa-green)]"
                                          : full
                                          ? "border-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] opacity-40 cursor-not-allowed"
                                          : "border-[var(--color-wa-sep)] text-[var(--color-wa-text-main)] hover:border-[var(--color-wa-green)]"
                                      }`}
                                    >
                                      {s.name}
                                      {full && !selected && " · Cupo lleno"}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-wa-text-sec)] mb-1">Notas (opcional)</label>
                    <textarea
                      rows={2}
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      placeholder="Notas internas..."
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-3 flex gap-2 flex-shrink-0 border-t border-[var(--color-wa-sep)]">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 py-3 border border-[var(--color-wa-sep)] text-[var(--color-wa-text-main)] text-sm font-medium rounded-xl hover:bg-[var(--color-wa-hover)] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={editingEnrollment ? saveEdit : saveNew}
                disabled={
                  savingModal ||
                  (!editingEnrollment && modalPersons.every((p) => !p.name.trim() || p.services.length === 0))
                }
                className="flex-1 py-3 bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] text-sm font-semibold rounded-xl hover:bg-[var(--color-wa-green-dark)] disabled:opacity-50 transition-colors"
              >
                {savingModal ? "Guardando…" : editingEnrollment ? "Guardar cambios" : "Inscribir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <ConfirmDialog
          message="¿Eliminar esta inscripción? Esta acción no se puede deshacer."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}
