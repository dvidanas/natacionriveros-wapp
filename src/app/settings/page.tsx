"use client";
import { useState, useEffect, useCallback } from "react";
import { TopNav, BottomNav } from "@/components/TopNav";

// ── Types ──────────────────────────────────────────────────────────────────────

interface BusinessInfo {
  business_name: string;
  business_description: string;
}

interface Discipline {
  id: number;
  name: string;
  description: string | null;
  days: string | null;
  hours: string | null;
  price: string | null;
  duration_minutes: number;
  teacher: string | null;
  capacity: number;
  active: number;
  enrolled?: number;
}

interface Resource {
  id: number;
  name: string;
  phone: string | null;
  active: number;
}

interface AvailabilitySlot {
  id: number;
  resource_id: number;
  day_of_week: number;
  time_start: string;
  time_end: string;
}

interface BackupInfo {
  filename: string;
  createdAt: string;
  sizeBytes: number;
}

type Tab = "whatsapp" | "disciplinas" | "profesores" | "negocio" | "apariencia" | "backup";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAYS_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-[var(--color-wa-panel-l)] rounded-2xl border border-[var(--color-wa-sep)] overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="px-5 py-3.5 border-b border-[var(--color-wa-sep)]">
        <h3 className="text-[11px] font-semibold tracking-widest uppercase text-[var(--color-wa-text-sec)]">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SaveButton({ loading, onClick, label }: { loading: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-5 py-2.5 bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] text-sm font-semibold rounded-xl hover:bg-[var(--color-wa-green-dark)] active:scale-95 disabled:opacity-50 transition-all duration-150 shadow-sm"
    >
      {loading ? "Guardando…" : (label ?? "Guardar")}
    </button>
  );
}

function inputCls() {
  return "w-full bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/20 transition-colors";
}

// ── Tab: WhatsApp ──────────────────────────────────────────────────────────────

function TabWhatsApp() {
  const [conn, setConn] = useState<{ status: string; phone?: string | null; qr?: string | null } | null>(null);
  const [logging, setLogging] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/connection/status").then((r) => r.json()).catch(() => null);
    setConn(res);
  }, []);

  useEffect(() => {
    loadStatus();
    const iv = setInterval(loadStatus, 5000);
    return () => clearInterval(iv);
  }, [loadStatus]);

  const disconnect = async () => {
    if (!confirm("¿Desconectar WhatsApp? Tendrás que escanear el QR de nuevo.")) return;
    setLogging(true);
    await fetch("/api/connection/logout", { method: "POST" });
    setLogging(false);
    loadStatus();
  };

  const statusLabel = {
    open: { text: "Conectado", color: "bg-[var(--color-wa-green)]/15 text-[var(--color-wa-green)]" },
    qr: { text: "Esperando QR", color: "bg-amber-500/15 text-amber-500" },
    connecting: { text: "Conectando…", color: "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]" },
    close: { text: "Desconectado", color: "bg-red-500/15 text-red-500" },
  }[conn?.status ?? "connecting"] ?? { text: "Desconocido", color: "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]" };

  return (
    <div className="flex flex-col gap-4">
      <Section title="Estado de la conexión">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-medium text-[var(--color-wa-text-main)]">WhatsApp</p>
              {conn?.status === "open" && conn.phone && (
                <p className="text-sm text-[var(--color-wa-text-sec)] mt-0.5">+{conn.phone}</p>
              )}
            </div>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusLabel.color}`}>
              {statusLabel.text}
            </span>
          </div>
          {conn?.status === "open" && (
            <button
              onClick={disconnect}
              disabled={logging}
              className="self-start px-4 py-2 text-sm font-medium text-red-500 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {logging ? "Desconectando…" : "Desconectar"}
            </button>
          )}
        </div>
      </Section>

      {conn?.status === "qr" && (
        <Section title="Escanear QR">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white rounded-xl p-3 w-56 h-56 flex items-center justify-center">
              {conn.qr
                ? <img src={conn.qr} alt="QR WhatsApp" className="w-full h-full object-contain" />
                : <p className="text-sm text-gray-400">Cargando…</p>
              }
            </div>
            <ol className="space-y-1 text-sm text-[var(--color-wa-text-sec)] w-full">
              <li>1. Abrí WhatsApp en tu teléfono</li>
              <li>2. Menú → Dispositivos vinculados → Vincular dispositivo</li>
              <li>3. Apuntá la cámara al QR</li>
            </ol>
          </div>
        </Section>
      )}

      {(conn?.status === "connecting" || conn?.status === "close") && (
        <Section title="Reconectando">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-[var(--color-wa-green)] border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-sm text-[var(--color-wa-text-sec)]">
              {conn?.status === "connecting" ? "Iniciando conexión con WhatsApp…" : "Reconectando…"}
            </p>
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Tab: Disciplinas ───────────────────────────────────────────────────────────

const EMPTY_DISCIPLINE = {
  name: "", description: "", days: "", hours: "", price: "", teacher: "", capacity: 10, duration_minutes: 60,
};

function TabDisciplinas() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_DISCIPLINE);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/settings/services?includeInactive=true")
      .then((r) => r.json())
      .then(setDisciplines)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      days: form.days.trim() || null,
      hours: form.hours.trim() || null,
      price: form.price.trim() || null,
      teacher: form.teacher.trim() || null,
      capacity: Number(form.capacity) || 10,
      duration_minutes: Number(form.duration_minutes) || 60,
    };
    if (editId !== null) {
      await fetch(`/api/settings/services/${editId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/settings/services", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setForm(EMPTY_DISCIPLINE);
    setEditId(null);
    load();
  };

  const toggleActive = async (d: Discipline) => {
    await fetch(`/api/settings/services/${d.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: d.active ? 0 : 1 }),
    });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar esta disciplina?")) return;
    await fetch(`/api/settings/services/${id}`, { method: "DELETE" });
    load();
  };

  const startEdit = (d: Discipline) => {
    setEditId(d.id);
    setForm({
      name: d.name,
      description: d.description ?? "",
      days: d.days ?? "",
      hours: d.hours ?? "",
      price: d.price ?? "",
      teacher: d.teacher ?? "",
      capacity: d.capacity,
      duration_minutes: d.duration_minutes,
    });
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY_DISCIPLINE); };

  if (loading) return <div className="text-sm text-[var(--color-wa-text-sec)]">Cargando…</div>;

  return (
    <div className="flex flex-col gap-4">
      <Section title={editId !== null ? "Editar disciplina" : "Nueva disciplina"}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Nombre *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputCls()} placeholder="Ej: Natación para Niños" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Precio</label>
              <input value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} className={inputCls()} placeholder="Ej: $45.000 / mes" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Días</label>
              <input value={form.days} onChange={(e) => setForm((p) => ({ ...p, days: e.target.value }))} className={inputCls()} placeholder="Ej: Lun / Mié / Vie" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Horarios</label>
              <input value={form.hours} onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))} className={inputCls()} placeholder="Ej: 08:00 - 09:00" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Profesor</label>
              <input value={form.teacher} onChange={(e) => setForm((p) => ({ ...p, teacher: e.target.value }))} className={inputCls()} placeholder="Ej: Prof. García" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Cupo máximo</label>
              <input type="number" min={1} value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) }))} className={inputCls()} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Duración (min)</label>
              <input type="number" min={5} step={5} value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))} className={inputCls()} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Descripción</label>
            <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={inputCls()} placeholder="Descripción breve de la disciplina" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <SaveButton loading={saving} onClick={save} />
            {editId !== null && (
              <button onClick={cancelEdit} className="px-4 py-2 text-sm text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)]">Cancelar</button>
            )}
          </div>
        </div>
      </Section>

      {disciplines.length > 0 && (
        <Section title={`Disciplinas (${disciplines.length})`}>
          <ul className="flex flex-col gap-2">
            {disciplines.map((d) => (
              <li key={d.id} className={`rounded-xl border overflow-hidden ${d.active ? "border-[var(--color-wa-sep)]" : "border-dashed border-[var(--color-wa-sep)] opacity-50"}`}>
                <div className="flex items-start gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[var(--color-wa-text-main)]">{d.name}</p>
                      {!d.active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] font-medium">Inactiva</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      {d.days && (
                        <span className="flex items-center gap-1 text-xs text-[var(--color-wa-text-sec)]">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          {d.days}
                        </span>
                      )}
                      {d.hours && (
                        <span className="flex items-center gap-1 text-xs text-[var(--color-wa-text-sec)]">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {d.hours}
                        </span>
                      )}
                      {d.teacher && (
                        <span className="flex items-center gap-1 text-xs text-[var(--color-wa-text-sec)]">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          {d.teacher}
                        </span>
                      )}
                      {d.price && (
                        <span className="text-xs font-semibold text-[var(--color-wa-green)]">{d.price}</span>
                      )}
                      <span className="text-xs text-[var(--color-wa-text-sec)]">
                        Cupo: {d.enrolled ?? 0}/{d.capacity}
                      </span>
                    </div>
                    {d.description && <p className="text-xs text-[var(--color-wa-text-sec)] mt-0.5 truncate">{d.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(d)} className="p-1.5 rounded hover:bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)]" title="Editar">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => toggleActive(d)} className="p-1.5 rounded hover:bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)]" title={d.active ? "Desactivar" : "Activar"}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {d.active
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        }
                      </svg>
                    </button>
                    <button onClick={() => remove(d.id)} className="p-1.5 rounded hover:bg-[var(--color-wa-hover)] text-red-500" title="Eliminar">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

// ── Tab: Profesores ────────────────────────────────────────────────────────────

function TabProfesores() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [allDisciplines, setAllDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [availability, setAvailability] = useState<Record<number, AvailabilitySlot[]>>({});
  const [assignedDisciplines, setAssignedDisciplines] = useState<Record<number, number[]>>({});
  const [editForm, setEditForm] = useState<Record<number, { name: string; phone: string }>>({});

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/settings/resources").then((r) => r.json()),
      fetch("/api/settings/services").then((r) => r.json()),
    ]).then(([res, svc]) => {
      setResources(res);
      setAllDisciplines(svc);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadExpanded = async (id: number) => {
    const [slots, assigned] = await Promise.all([
      fetch(`/api/settings/resources/${id}`).then((r) => r.json()),
      fetch(`/api/settings/resources/${id}/services`).then((r) => r.json()),
    ]);
    setAvailability((p) => ({ ...p, [id]: slots }));
    setAssignedDisciplines((p) => ({ ...p, [id]: (assigned as Discipline[]).map((d) => d.id) }));
  };

  const toggleExpand = (r: Resource) => {
    if (expandedId === r.id) { setExpandedId(null); return; }
    setExpandedId(r.id);
    setEditForm((p) => ({ ...p, [r.id]: { name: r.name, phone: r.phone ?? "" } }));
    loadExpanded(r.id);
  };

  const create = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await fetch("/api/settings/resources", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), phone: newPhone.trim() || null }),
    });
    setNewName(""); setNewPhone("");
    setSaving(false);
    load();
  };

  const saveProfile = async (id: number) => {
    const f = editForm[id];
    if (!f) return;
    await fetch(`/api/settings/resources/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: f.name.trim(), phone: f.phone.trim() || null }),
    });
    load();
  };

  const toggleActive = async (r: Resource) => {
    await fetch(`/api/settings/resources/${r.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: r.active ? 0 : 1 }),
    });
    load();
  };

  const remove = async (id: number) => {
    const res = await fetch(`/api/settings/resources/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "No se pudo eliminar.");
      return;
    }
    if (expandedId === id) setExpandedId(null);
    load();
  };

  const toggleDay = async (resourceId: number, day: number) => {
    const current = availability[resourceId] ?? [];
    const exists = current.some((s) => s.day_of_week === day);
    const next = exists
      ? current.filter((s) => s.day_of_week !== day)
      : [...current, { id: 0, resource_id: resourceId, day_of_week: day, time_start: "08:00", time_end: "22:00" }];
    setAvailability((p) => ({ ...p, [resourceId]: next }));
    await fetch(`/api/settings/resources/${resourceId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability: next.map(({ day_of_week, time_start, time_end }) => ({ day_of_week, time_start, time_end })) }),
    });
  };

  const updateTime = (resourceId: number, day: number, field: "time_start" | "time_end", val: string) => {
    setAvailability((p) => ({
      ...p,
      [resourceId]: (p[resourceId] ?? []).map((s) => s.day_of_week === day ? { ...s, [field]: val } : s),
    }));
  };

  const saveAvailability = async (resourceId: number) => {
    const slots = availability[resourceId] ?? [];
    await fetch(`/api/settings/resources/${resourceId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability: slots.map(({ day_of_week, time_start, time_end }) => ({ day_of_week, time_start, time_end })) }),
    });
  };

  const toggleDiscipline = async (resourceId: number, disciplineId: number) => {
    const current = assignedDisciplines[resourceId] ?? [];
    const next = current.includes(disciplineId)
      ? current.filter((id) => id !== disciplineId)
      : [...current, disciplineId];
    setAssignedDisciplines((p) => ({ ...p, [resourceId]: next }));
    await fetch(`/api/settings/resources/${resourceId}/services`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_ids: next }),
    });
  };

  if (loading) return <div className="text-sm text-[var(--color-wa-text-sec)]">Cargando…</div>;

  return (
    <div className="flex flex-col gap-4">
      <Section title="Nuevo profesor">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Nombre *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                className={inputCls()}
                placeholder="Nombre del profesor"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-wa-text-sec)] mb-1">Teléfono</label>
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className={inputCls()}
                placeholder="Ej: 2612345678"
              />
            </div>
          </div>
          <div>
            <SaveButton loading={saving} onClick={create} label="Agregar profesor" />
          </div>
        </div>
      </Section>

      {resources.length > 0 && (
        <Section title={`Profesores (${resources.length})`}>
          <ul className="flex flex-col gap-2">
            {resources.map((r) => (
              <li key={r.id} className="border border-[var(--color-wa-sep)] rounded-xl overflow-hidden">
                {/* Fila principal */}
                <div className="flex items-center gap-3 px-3 py-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.active ? "bg-[var(--color-wa-green)]" : "bg-[var(--color-wa-text-sec)]"}`} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-semibold ${r.active ? "text-[var(--color-wa-text-main)]" : "text-[var(--color-wa-text-sec)] line-through"}`}>
                      {r.name}
                    </span>
                    {r.phone && <p className="text-xs text-[var(--color-wa-text-sec)]">{r.phone}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleExpand(r)} className={`p-1.5 rounded hover:bg-[var(--color-wa-hover)] transition-colors ${expandedId === r.id ? "text-[var(--color-wa-green)]" : "text-[var(--color-wa-text-sec)]"}`} title="Editar">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => toggleActive(r)} className="p-1.5 rounded hover:bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)]" title={r.active ? "Desactivar" : "Activar"}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {r.active
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        }
                      </svg>
                    </button>
                    <button onClick={() => remove(r.id)} className="p-1.5 rounded hover:bg-[var(--color-wa-hover)] text-red-500" title="Eliminar">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                {/* Panel expandido */}
                {expandedId === r.id && (
                  <div className="border-t border-[var(--color-wa-sep)] bg-[var(--color-wa-bg-main)]">
                    {/* Datos del perfil */}
                    <div className="px-4 py-3 border-b border-[var(--color-wa-sep)]">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)] mb-2">Datos del profesor</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-[var(--color-wa-text-sec)] mb-1">Nombre</label>
                          <input
                            value={editForm[r.id]?.name ?? ""}
                            onChange={(e) => setEditForm((p) => ({ ...p, [r.id]: { ...p[r.id], name: e.target.value } }))}
                            className={inputCls()}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--color-wa-text-sec)] mb-1">Teléfono</label>
                          <input
                            value={editForm[r.id]?.phone ?? ""}
                            onChange={(e) => setEditForm((p) => ({ ...p, [r.id]: { ...p[r.id], phone: e.target.value } }))}
                            className={inputCls()}
                            placeholder="Ej: 2612345678"
                          />
                        </div>
                      </div>
                      <button onClick={() => saveProfile(r.id)} className="mt-2 px-4 py-1.5 bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] text-xs font-semibold rounded-lg hover:bg-[var(--color-wa-green-dark)] transition-colors">
                        Guardar datos
                      </button>
                    </div>

                    {/* Disciplinas asignadas */}
                    {allDisciplines.length > 0 && (
                      <div className="px-4 py-3 border-b border-[var(--color-wa-sep)]">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)] mb-2">Disciplinas que dicta</p>
                        <div className="flex flex-wrap gap-2">
                          {allDisciplines.map((d) => {
                            const checked = (assignedDisciplines[r.id] ?? []).includes(d.id);
                            return (
                              <button
                                key={d.id}
                                onClick={() => toggleDiscipline(r.id, d.id)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                  checked
                                    ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)]"
                                    : "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)] hover:bg-[var(--color-wa-hover)]"
                                }`}
                              >
                                {d.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Horarios de disponibilidad */}
                    <div className="px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)] mb-2">Días y horarios de atención</p>
                      <div className="flex flex-col gap-2">
                        {DAYS.map((d, i) => {
                          const slot = (availability[r.id] ?? []).find((s) => s.day_of_week === i);
                          const active = !!slot;
                          return (
                            <div key={i} className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => toggleDay(r.id, i)}
                                className={`w-10 text-xs font-semibold py-1 rounded ${active ? "bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)]" : "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]"}`}
                              >
                                {d}
                              </button>
                              {active && (
                                <>
                                  <input type="time" value={slot.time_start} onChange={(e) => updateTime(r.id, i, "time_start", e.target.value)} className="bg-[var(--color-wa-panel-l)] border border-[var(--color-wa-sep)] rounded-lg px-2 py-1 text-xs text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] transition-colors" />
                                  <span className="text-xs text-[var(--color-wa-text-sec)]">a</span>
                                  <input type="time" value={slot.time_end} onChange={(e) => updateTime(r.id, i, "time_end", e.target.value)} className="bg-[var(--color-wa-panel-l)] border border-[var(--color-wa-sep)] rounded-lg px-2 py-1 text-xs text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] transition-colors" />
                                </>
                              )}
                              {!active && <span className="text-xs text-[var(--color-wa-text-sec)]">{DAYS_FULL[i]} — sin atención</span>}
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={() => saveAvailability(r.id)} className="mt-3 px-4 py-1.5 bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] text-xs font-semibold rounded-lg hover:bg-[var(--color-wa-green-dark)] transition-colors">
                        Guardar horarios
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

// ── Tab: Negocio ──────────────────────────────────────────────────────────────

function TabNegocio() {
  const [info, setInfo] = useState<BusinessInfo>({ business_name: "", business_description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/business")
      .then((r) => r.json())
      .then(setInfo)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/settings/business", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(info),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="text-sm text-[var(--color-wa-text-sec)]">Cargando…</div>;

  return (
    <div className="flex flex-col gap-4">
      <Section title="Datos del negocio">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Nombre del negocio</label>
            <input value={info.business_name} onChange={(e) => setInfo((p) => ({ ...p, business_name: e.target.value }))} className={inputCls()} placeholder="Nombre de tu negocio" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-wa-text-main)] mb-1">Descripción</label>
            <textarea
              value={info.business_description}
              onChange={(e) => setInfo((p) => ({ ...p, business_description: e.target.value }))}
              rows={4}
              className="w-full bg-[var(--color-wa-bg-main)] border border-[var(--color-wa-sep)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-wa-text-main)] outline-none focus:border-[var(--color-wa-green)] focus:ring-2 focus:ring-[var(--color-wa-green)]/20 transition-colors resize-none"
              placeholder="Descripción breve del negocio"
            />
          </div>
          <div className="flex items-center gap-3">
            <SaveButton loading={saving} onClick={save} />
            {saved && <span className="text-sm text-[var(--color-wa-green)]">Guardado ✓</span>}
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── Tab: Apariencia ────────────────────────────────────────────────────────────

function TabApariencia() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) { document.documentElement.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else { document.documentElement.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  };

  return (
    <Section title="Tema de la interfaz">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-medium text-[var(--color-wa-text-main)]">{isDark ? "Modo oscuro" : "Modo claro"}</p>
          <p className="text-sm text-[var(--color-wa-text-sec)] mt-0.5">Cambia la apariencia de toda la aplicación</p>
        </div>
        <button
          onClick={toggle}
          className="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none"
          style={{ backgroundColor: isDark ? "var(--color-wa-green)" : "var(--color-wa-sep)" }}
        >
          <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200" style={{ transform: isDark ? "translateX(24px)" : "translateX(0)" }} />
        </button>
      </div>
    </Section>
  );
}

// ── Tab: Backup ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function TabBackup() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [driveConfigured, setDriveConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/backup")
      .then((r) => r.json())
      .then((data) => { setBackups(data.backups ?? []); setDriveConfigured(data.driveConfigured ?? false); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const triggerBackup = async () => {
    setRunning(true); setLastResult(null);
    const res = await fetch("/api/backup", { method: "POST" });
    const data = await res.json();
    if (data.ok) { setLastResult({ ok: true, msg: `Backup creado: ${data.filename}${data.driveFileId ? " · subido a Google Drive" : ""}` }); load(); }
    else { setLastResult({ ok: false, msg: data.error ?? "Error desconocido" }); }
    setRunning(false);
  };

  const download = (filename: string) => { window.open(`/api/backup?file=${encodeURIComponent(filename)}`, "_blank"); };

  if (loading) return <div className="text-sm text-[var(--color-wa-text-sec)]">Cargando…</div>;

  return (
    <div className="flex flex-col gap-4">
      <Section title="Estado del backup">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-medium text-[var(--color-wa-text-main)]">Backup automático</p>
              <p className="text-sm text-[var(--color-wa-text-sec)] mt-0.5">Se ejecuta cada 24 h al arrancar el servidor</p>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[var(--color-wa-green)]/15 text-[var(--color-wa-green)]">Activo</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-wa-sep)]">
            <div>
              <p className="text-base font-medium text-[var(--color-wa-text-main)]">Google Drive</p>
              <p className="text-sm text-[var(--color-wa-text-sec)] mt-0.5">{driveConfigured ? "Configurado — backups se suben automáticamente" : "No configurado — solo backups locales"}</p>
            </div>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${driveConfigured ? "bg-[var(--color-wa-green)]/15 text-[var(--color-wa-green)]" : "bg-[var(--color-wa-sep)] text-[var(--color-wa-text-sec)]"}`}>
              {driveConfigured ? "Conectado" : "Sin configurar"}
            </span>
          </div>
          {backups[0] && (
            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-wa-sep)]">
              <div>
                <p className="text-sm font-medium text-[var(--color-wa-text-main)]">Último backup</p>
                <p className="text-sm text-[var(--color-wa-text-sec)] mt-0.5">{formatDate(backups[0].createdAt)} · {formatBytes(backups[0].sizeBytes)}</p>
              </div>
              <button onClick={() => download(backups[0].filename)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)] hover:bg-[var(--color-wa-hover)] rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Descargar
              </button>
            </div>
          )}
        </div>
      </Section>
      <Section title="Backup manual">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--color-wa-text-sec)]">Creá un backup ahora mismo. Se guardará en el servidor y, si Google Drive está configurado, también se subirá.</p>
          <button onClick={triggerBackup} disabled={running} className="self-start px-5 py-2.5 bg-[var(--color-wa-green)] text-[var(--color-wa-green-text)] text-sm font-semibold rounded-xl hover:bg-[var(--color-wa-green-dark)] active:scale-95 disabled:opacity-50 transition-all duration-150 shadow-sm">
            {running ? "Creando backup…" : "Crear backup ahora"}
          </button>
          {lastResult && <p className={`text-sm ${lastResult.ok ? "text-[var(--color-wa-green)]" : "text-red-500"}`}>{lastResult.ok ? "✓ " : "✗ "}{lastResult.msg}</p>}
        </div>
      </Section>
      {backups.length > 0 && (
        <Section title={`Backups guardados (${backups.length})`}>
          <ul className="flex flex-col gap-1">
            {backups.map((b) => (
              <li key={b.filename} className="flex items-center justify-between gap-3 py-2 border-b border-[var(--color-wa-sep)] last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-wa-text-main)] truncate">{formatDate(b.createdAt)}</p>
                  <p className="text-xs text-[var(--color-wa-text-sec)]">{formatBytes(b.sizeBytes)}</p>
                </div>
                <button onClick={() => download(b.filename)} className="p-1.5 rounded hover:bg-[var(--color-wa-hover)] text-[var(--color-wa-text-sec)] flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--color-wa-text-sec)] mt-3">Se guardan los últimos 30 backups.</p>
        </Section>
      )}
      {backups.length === 0 && (
        <div className="text-center py-8 text-[var(--color-wa-text-sec)] text-sm">Todavía no hay backups. El primero se creará automáticamente a los 2 minutos de arrancar.</div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>,
  },
  {
    key: "disciplinas",
    label: "Disciplinas",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  },
  {
    key: "profesores",
    label: "Profesores",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    key: "negocio",
    label: "Negocio",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
  {
    key: "apariencia",
    label: "Apariencia",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  },
  {
    key: "backup",
    label: "Backup",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>,
  },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("disciplinas");

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-wa-bg-main)]">
      <TopNav />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex flex-1 min-h-0 md:p-3 md:gap-3">
          <nav className="hidden md:flex flex-col w-[350px] bg-white dark:bg-[var(--color-wa-panel-l)] rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] py-3 gap-0.5 px-2 flex-shrink-0 overflow-y-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left ${
                  tab === t.key
                    ? "bg-[var(--color-wa-green)]/10 text-[var(--color-wa-green)] font-semibold"
                    : "text-[var(--color-wa-text-sec)] hover:bg-[var(--color-wa-hover)] hover:text-[var(--color-wa-text-main)]"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex flex-col flex-1 min-w-0 md:bg-white md:dark:bg-[var(--color-wa-panel-l)] md:rounded-2xl md:shadow-[0_1px_4px_rgba(0,0,0,0.08)] md:overflow-hidden">
            <div className="md:hidden flex border-b border-[var(--color-wa-sep)] bg-[var(--color-wa-panel-l)] flex-shrink-0 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 text-[10px] font-semibold whitespace-nowrap transition-all duration-150 border-b-2 ${
                    tab === t.key
                      ? "border-[var(--color-wa-green)] text-[var(--color-wa-green)]"
                      : "border-transparent text-[var(--color-wa-text-sec)] hover:text-[var(--color-wa-text-main)]"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="w-full max-w-5xl mx-auto">
                <div key={tab} className="animate-in flex flex-col gap-4">
                  {tab === "whatsapp" && <TabWhatsApp />}
                  {tab === "disciplinas" && <TabDisciplinas />}
                  {tab === "profesores" && <TabProfesores />}
                  {tab === "negocio" && <TabNegocio />}
                  {tab === "apariencia" && <TabApariencia />}
                  {tab === "backup" && <TabBackup />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
