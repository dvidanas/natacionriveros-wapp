"use client";
import { TopNav, BottomNav } from "@/components/TopNav";
import { useState, useEffect } from "react";

interface DisciplineRow {
  name: string;
  capacity: number;
  active: number;
  enrolled: number;
  confirmed: number;
  pending: number;
  cancelled: number;
}

interface MonthRow {
  label: string;
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
}

interface MetricsData {
  month: string;
  current: {
    total: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    uniqueStudents: number;
    fromBot: number;
    fromManual: number;
  };
  byDiscipline: DisciplineRow[];
  monthly: MonthRow[];
  conversations: {
    total: number;
    aiMessages: number;
    humanMessages: number;
    monthLeads: number;
  };
}

function KpiCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-wa-panel-l)] p-5 rounded-2xl border border-[var(--color-wa-sep)]" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
          {icon}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)]">{label}</p>
      </div>
      <p className="text-3xl font-bold text-[var(--color-wa-text-main)] leading-none">{value}</p>
      {sub && <p className="text-xs text-[var(--color-wa-text-sec)] mt-1.5">{sub}</p>}
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-[var(--color-wa-text-main)] font-medium truncate max-w-[160px]">{label}</span>
        <span className="text-[var(--color-wa-text-sec)] font-mono flex-shrink-0 ml-2">{value}</span>
      </div>
      <div className="h-2 bg-[var(--color-wa-hover)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function MetricsPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const maxMonthly = data ? Math.max(...data.monthly.map((m) => m.total), 1) : 1;
  const maxDiscipline = data ? Math.max(...data.byDiscipline.map((d) => d.capacity), 1) : 1;

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-wa-bg-main)]">
      <TopNav />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

          {/* Header */}
          <div>
            <h1 className="text-xl font-bold text-[var(--color-wa-text-main)]">Métricas</h1>
            {data && (
              <p className="text-sm text-[var(--color-wa-text-sec)]">
                {data.month} · las inscripciones se renuevan mensualmente
              </p>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-[var(--color-wa-panel-l)] rounded-2xl border border-[var(--color-wa-sep)] animate-pulse" />
              ))}
            </div>
          ) : data ? (
            <>
              {/* ── KPIs principales ── */}
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-wa-text-sec)] mb-3">
                  Inscripciones — {data.month}
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard
                    label="Inscriptos activos"
                    value={data.current.total}
                    sub={`${data.current.uniqueStudents} alumno${data.current.uniqueStudents !== 1 ? "s" : ""} único${data.current.uniqueStudents !== 1 ? "s" : ""}`}
                    color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
                    icon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    }
                  />
                  <KpiCard
                    label="Confirmados (pago OK)"
                    value={data.current.confirmed}
                    sub={data.current.total > 0 ? `${Math.round((data.current.confirmed / data.current.total) * 100)}% del total` : "Sin inscripciones"}
                    color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    icon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    }
                  />
                  <KpiCard
                    label="Pendientes de pago"
                    value={data.current.pending}
                    sub="Aguardan confirmación"
                    color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                    icon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  />
                  <KpiCard
                    label="Cancelados"
                    value={data.current.cancelled}
                    sub="No confirmados / rechazados"
                    color="bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400"
                    icon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    }
                  />
                </div>
              </section>

              {/* ── Por disciplina ── */}
              {data.byDiscipline.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-wa-text-sec)] mb-3">
                    Ocupación por disciplina — {data.month}
                  </h2>
                  <div className="bg-[var(--color-wa-panel-l)] rounded-2xl border border-[var(--color-wa-sep)] overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-wa-sep)]">
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)]">Disciplina</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)]">Inscriptos</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider text-teal-500">Confirm.</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider text-amber-500">Pend.</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)]">Cupo</th>
                          <th className="px-4 py-3 w-28"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-wa-sep)]">
                        {data.byDiscipline.map((d) => {
                          const pct = d.capacity > 0 ? Math.min(Math.round((d.enrolled / d.capacity) * 100), 100) : 0;
                          const isFull = d.enrolled >= d.capacity;
                          return (
                            <tr key={d.name} className={`hover:bg-[var(--color-wa-hover)] transition-colors ${!d.active ? "opacity-50" : ""}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isFull ? "bg-red-400" : d.enrolled > 0 ? "bg-[var(--color-wa-green)]" : "bg-[var(--color-wa-sep)]"}`} />
                                  <span className="font-medium text-[var(--color-wa-text-main)] truncate">{d.name}</span>
                                  {isFull && <span className="text-xs text-red-500 font-semibold">Lleno</span>}
                                  {!d.active && <span className="text-xs text-[var(--color-wa-text-sec)]">(inactiva)</span>}
                                </div>
                              </td>
                              <td className="text-center px-3 py-3 font-bold text-[var(--color-wa-text-main)]">{d.enrolled}</td>
                              <td className="text-center px-3 py-3 text-teal-500 font-semibold">{d.confirmed}</td>
                              <td className="text-center px-3 py-3 text-amber-500 font-semibold">{d.pending}</td>
                              <td className="text-center px-3 py-3 text-[var(--color-wa-text-sec)]">{d.capacity}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-[var(--color-wa-hover)] rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${isFull ? "bg-red-400" : "bg-[var(--color-wa-green)]"}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-[var(--color-wa-text-sec)] w-8 text-right">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* ── Historial mensual + Bot ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Historial */}
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-wa-text-sec)] mb-3">
                    Histórico — últimos 6 meses
                  </h2>
                  <div className="bg-[var(--color-wa-panel-l)] rounded-2xl border border-[var(--color-wa-sep)] p-5 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
                    {data.monthly.map((m, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className="font-medium text-[var(--color-wa-text-main)]">{m.label}</span>
                          <div className="flex gap-3 text-[var(--color-wa-text-sec)]">
                            <span className="text-teal-500 font-semibold">{m.confirmed} conf.</span>
                            <span className="text-amber-500 font-semibold">{m.pending} pend.</span>
                            <span className="font-bold text-[var(--color-wa-text-main)]">{m.total} total</span>
                          </div>
                        </div>
                        <div className="h-2 bg-[var(--color-wa-hover)] rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-teal-400 transition-all duration-500"
                            style={{ width: maxMonthly > 0 ? `${(m.confirmed / maxMonthly) * 100}%` : "0%" }}
                          />
                          <div
                            className="h-full bg-amber-400 transition-all duration-500"
                            style={{ width: maxMonthly > 0 ? `${(m.pending / maxMonthly) * 100}%` : "0%" }}
                          />
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-[var(--color-wa-text-sec)] pt-1">
                      Las inscripciones se registran por mes de inicio. No se acumulan entre meses.
                    </p>
                  </div>
                </section>

                {/* Actividad del bot */}
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-wa-text-sec)] mb-3">
                    Actividad del bot
                  </h2>
                  <div className="bg-[var(--color-wa-panel-l)] rounded-2xl border border-[var(--color-wa-sep)] p-5 space-y-5" style={{ boxShadow: "var(--shadow-card)" }}>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[var(--color-wa-hover)] rounded-xl p-3">
                        <p className="text-2xl font-bold text-[var(--color-wa-text-main)]">{data.conversations.total}</p>
                        <p className="text-xs text-[var(--color-wa-text-sec)] mt-0.5">Conversaciones totales</p>
                      </div>
                      <div className="bg-[var(--color-wa-hover)] rounded-xl p-3">
                        <p className="text-2xl font-bold text-[var(--color-wa-green)]">{data.conversations.aiMessages}</p>
                        <p className="text-xs text-[var(--color-wa-text-sec)] mt-0.5">Mensajes enviados por IA</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <BarRow
                        label="Respuestas de IA"
                        value={data.conversations.aiMessages}
                        max={data.conversations.aiMessages + data.conversations.humanMessages}
                        color="bg-[var(--color-wa-green)]"
                      />
                      <BarRow
                        label="Mensajes manuales"
                        value={data.conversations.humanMessages}
                        max={data.conversations.aiMessages + data.conversations.humanMessages}
                        color="bg-amber-400"
                      />
                    </div>

                    <div className="border-t border-[var(--color-wa-sep)] pt-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-wa-text-sec)]">
                        Inscripciones — {data.month}
                      </p>
                      <BarRow
                        label="Via bot"
                        value={data.current.fromBot}
                        max={data.current.total || 1}
                        color="bg-[var(--color-wa-green)]"
                      />
                      <BarRow
                        label="Manual (panel)"
                        value={data.current.fromManual}
                        max={data.current.total || 1}
                        color="bg-blue-400"
                      />
                    </div>
                  </div>
                </section>
              </div>

            </>
          ) : (
            <p className="text-sm text-[var(--color-wa-text-sec)]">No se pudieron cargar las métricas.</p>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
