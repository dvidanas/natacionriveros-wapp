import {
  wasMessageProcessed,
  markMessageProcessed,
  getOrCreateConversation,
  getConversationById,
  insertMessage,
  updateMessageWaId,
  getRecentHistory,
  createLead,
  updateLead,
  setConversationHasLead,
  getLeadByConversationId,
  getNextAvailableSlots,
  getAvailableSlots,
  createAppointment,
  hasAppointmentForSlot,
  listServicesWithEnrollment,
  hasEnrollmentForConversation,
  type AvailableSlot,
} from "@/lib/db";
import { getChatCompletion, getRawCompletion, type ChatMessage } from "@/lib/gemini";
import { sendTextMessage } from "./client";
import { clientConfig } from "@/lib/client.config";

const DELAY = clientConfig.responseDelayMs ?? 8000;

const INTENT_KEYWORDS = [
  "presupuesto", "precio", "cuánto", "cuanto", "contratar", "contrataría",
  "quiero", "necesito", "me interesa", "interesado", "interesada",
  "cotizar", "cotización", "consulta", "información", "info",
  "servicio", "servicios", "inscribir", "inscripción", "inscribirme",
  "turno", "clase", "clases", "disciplina", "natación", "natacion",
  "cupo", "cupos", "disponible", "disponibilidad",
];

const NOT_A_NAME = [
  "gracias", "ok", "si", "no", "dale", "bueno", "listo",
  "perfecto", "genial", "bien", "claro", "obvio", "nada",
  "hola", "chau", "adios", "jaja", "jeje", "oka", "okey",
  "entendido", "de nada", "por favor", "porfa", "este",
  "ese", "eso", "acá", "ahi", "ahí", "ya", "igual",
  "después", "despues", "ahora", "luego", "mañana",
];

const NAME_ASK_KEYWORDS = [
  "nombre", "llamás", "llamas", "identificarte", "cómo te", "como te",
];

const pendingResponses = new Map<number, ReturnType<typeof setTimeout>>();

function hasLeadIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return INTENT_KEYWORDS.some((kw) => lower.includes(kw));
}

function isEngagedMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (NOT_A_NAME.includes(t)) return false;
  const wordCount = t.split(/\s+/).filter(Boolean).length;
  return wordCount >= 2 || t.length > 20;
}

function isRealName(name: string | null): boolean {
  if (!name) return false;
  return !/^\+?[\d\s\-()+]+$/.test(name);
}

function looksLikeName(text: string, lastBotMessage: string | null): boolean {
  if (!lastBotMessage) return false;
  const lastLower = lastBotMessage.toLowerCase();
  if (!NAME_ASK_KEYWORDS.some((kw) => lastLower.includes(kw))) return false;

  const t = text.trim();
  if (t.length < 2 || t.length > 40) return false;
  if (/[0-9]/.test(t)) return false;
  if (/[?!]/.test(t)) return false;
  if (NOT_A_NAME.includes(t.toLowerCase())) return false;
  if (hasLeadIntent(t)) return false;
  return true;
}

async function sendDebouncedReply(convoId: number, phone: string): Promise<void> {
  pendingResponses.delete(convoId);

  const fresh = getConversationById(convoId);
  if (!fresh || fresh.mode !== "AI") {
    console.log(`[baileys] modo ${fresh?.mode ?? "?"} — sin respuesta automática`);
    return;
  }

  const history = getRecentHistory(convoId, 20);
  const chatHistory: ChatMessage[] = history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  const engagedCount = history.filter(
    (m) => m.role === "user" && isEngagedMessage(m.content)
  ).length;

  const isFirstBotMessage = !history.some((m) => m.role === "assistant");

  const apptConfig = (clientConfig as Record<string, unknown>).appointments as
    | { enabled: boolean; defaultDuration: number }
    | undefined;
  let availabilityNote = "";
  let offeredSlots: Array<AvailableSlot & { date: string }> = [];
  if (apptConfig?.enabled) {
    offeredSlots = getNextAvailableSlots(3, apptConfig.defaultDuration ?? 30);
    if (offeredSlots.length > 0) {
      const slotList = offeredSlots
        .slice(0, 6)
        .map((s) => {
          const d = new Date(s.date + "T12:00:00");
          const dayName = d.toLocaleDateString("es-AR", { weekday: "long" });
          const [, month, day] = s.date.split("-");
          return `${dayName} ${day}/${month} a las ${s.time_start}`;
        })
        .join(", ");
      availabilityNote =
        ` DISPONIBILIDAD ACTUAL PARA TURNOS: ${slotList}. ` +
        "Si el usuario quiere un turno, podés ofrecerle estos horarios.";
    }
  }

  const firstMsgInstruction = isFirstBotMessage
    ? "Es tu PRIMER mensaje en esta conversación. " +
      "Saludá, presentá brevemente el complejo de natación en una sola oración, " +
      "y preguntá en qué disciplina o servicio está interesado. " +
      "Todo en un único mensaje corto y directo, sin listas ni saltos de línea."
    : undefined;

  const contactInstruction =
    engagedCount >= 4
      ? "El usuario ya respondió varias preguntas y hay contexto suficiente. " +
        "Es el momento de avanzar con la inscripción o coordinar directamente." +
        availabilityNote
      : availabilityNote || undefined;

  const extraInstruction =
    [firstMsgInstruction, contactInstruction].filter(Boolean).join(" ") || undefined;

  let rawReply: string;
  try {
    rawReply = await getChatCompletion(chatHistory, extraInstruction);
  } catch (err) {
    console.error(`[baileys] error Gemini para +${phone}:`, err);
    return;
  }

  if (!rawReply) {
    console.warn("[baileys] Gemini devolvió respuesta vacía");
    return;
  }

  const reply = rawReply.replace(/\n+/g, " ").trim();
  const messageId = insertMessage(convoId, "assistant", reply, null);

  try {
    const { wa_message_id } = await sendTextMessage(phone, reply);
    updateMessageWaId(messageId, wa_message_id);
    console.log(`[baileys] → enviado a +${phone}`);
  } catch (err) {
    console.error(`[baileys] error al enviar a +${phone}:`, err);
  }

  if (apptConfig?.enabled && offeredSlots.length > 0) {
    tryBookAppointmentFromChat(convoId, phone, history, offeredSlots, apptConfig.defaultDuration ?? 30).catch(
      (err) => console.error("[appt] error en tryBookAppointmentFromChat:", err)
    );
  }

  tryEnrollStudentFromChat(convoId, phone, history, reply).catch(
    (err) => console.error("[enroll] error en tryEnrollStudentFromChat:", err)
  );
}

async function tryBookAppointmentFromChat(
  convoId: number,
  phone: string,
  history: { role: string; content: string }[],
  offeredSlots: Array<AvailableSlot & { date: string }>,
  defaultDuration: number
): Promise<void> {
  const lastUserMsg = [...history].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) return;

  const slotList = offeredSlots.slice(0, 8).map((s) => `${s.date} ${s.time_start}`).join(", ");
  const conversation = history.slice(-6).map((m) =>
    `${m.role === "user" ? "Usuario" : "Bot"}: ${m.content}`
  ).join("\n");

  const prompt = `Sos un extractor de datos. Analizá esta conversación y determiná si el ÚLTIMO mensaje del usuario confirma o elige un turno específico de la lista.

Turnos disponibles ofrecidos: ${slotList}

Conversación:
${conversation}

Si el usuario eligió o confirmó un turno concreto de la lista, respondé ÚNICAMENTE con este JSON (sin markdown):
{"date":"YYYY-MM-DD","time_start":"HH:MM"}

Si NO eligió ninguno todavía, respondé ÚNICAMENTE con:
null`;

  let raw: string;
  try { raw = await getRawCompletion(prompt); } catch { return; }

  const clean = raw.trim().replace(/```json|```/g, "").trim();
  if (clean === "null" || !clean.startsWith("{")) return;

  let parsed: { date?: string; time_start?: string };
  try { parsed = JSON.parse(clean); } catch { return; }

  const { date, time_start } = parsed;
  if (!date || !time_start) return;

  const stillAvailable = getAvailableSlots(date, defaultDuration).some(
    (s) => s.time_start === time_start
  );
  if (!stillAvailable) return;

  if (hasAppointmentForSlot(convoId, date, time_start)) return;

  const lead = getLeadByConversationId(convoId);
  const validSlot = offeredSlots.find((s) => s.date === date && s.time_start === time_start);
  if (!validSlot) return;

  const id = createAppointment({
    resource_id: validSlot.resource_id,
    conversation_id: convoId,
    date,
    time_start,
    duration_minutes: defaultDuration,
    source: "bot",
    contact_name: lead?.name ?? null,
    contact_phone: phone,
  });

  console.log(`[appt] turno PENDIENTE creado id=${id} para +${phone} → ${date} ${time_start}`);
}

async function tryEnrollStudentFromChat(
  convoId: number,
  phone: string,
  history: { role: string; content: string }[],
  lastBotReply: string
): Promise<void> {
  if (!lastBotReply.includes("NatacionRiveros") && !lastBotReply.includes("PENDIENTE")) return;

  const services = listServicesWithEnrollment();
  if (services.length === 0) return;

  const serviceList = services.map((s) => `"${s.name}" (cupo: ${s.capacity - s.enrolled} disponibles)`).join(", ");
  const conversation = history.slice(-10).map((m) =>
    `${m.role === "user" ? "Usuario" : "Bot"}: ${m.content}`
  ).join("\n");

  const prompt = `Sos un extractor de datos. Analizá esta conversación de WhatsApp de un complejo de natación.

Disciplinas disponibles: ${serviceList}

Conversación:
${conversation}

Si el bot acaba de confirmar una inscripción PENDIENTE y el usuario proporcionó su nombre, respondé ÚNICAMENTE con este JSON (sin markdown):
{"discipline":"nombre exacto de la disciplina de la lista","student_name":"nombre del alumno"}

Si NO hay confirmación de inscripción con nombre de alumno, respondé ÚNICAMENTE con:
null`;

  let raw: string;
  try { raw = await getRawCompletion(prompt); } catch { return; }

  const clean = raw.trim().replace(/```json|```/g, "").trim();
  if (clean === "null" || !clean.startsWith("{")) return;

  let parsed: { discipline?: string; student_name?: string };
  try { parsed = JSON.parse(clean); } catch { return; }

  const { discipline, student_name } = parsed;
  if (!discipline || !student_name) return;

  const svc = services.find((s) => s.name.toLowerCase() === discipline.toLowerCase());
  if (!svc) return;
  if (svc.enrolled >= svc.capacity) {
    console.log(`[enroll] disciplina "${svc.name}" sin cupo (${svc.enrolled}/${svc.capacity})`);
    return;
  }

  if (hasEnrollmentForConversation(convoId, svc.name)) return;

  const today = new Date().toISOString().slice(0, 10);
  const id = createAppointment({
    resource_id: 1,
    conversation_id: convoId,
    service: svc.name,
    date: today,
    time_start: "00:00",
    duration_minutes: svc.duration_minutes,
    source: "bot",
    contact_name: student_name,
    contact_phone: phone,
  });

  console.log(`[enroll] inscripción PENDIENTE creada id=${id} — "${svc.name}" para ${student_name} (+${phone})`);
}

// ── Entry point llamado por Baileys client ──────────────────

export async function handleIncomingMessage(
  phone: string,
  text: string,
  name: string | null,
  msgId: string
): Promise<void> {
  // 1. Deduplicación
  if (wasMessageProcessed(msgId)) {
    console.log(`[baileys] duplicado ${msgId}, ignorando`);
    return;
  }
  markMessageProcessed(msgId);

  console.log(`[baileys] ← de +${phone}: "${text.slice(0, 60)}"`);

  // 2. Conversación
  const convo = getOrCreateConversation(phone, name);

  // 3. Guardar mensaje
  insertMessage(convo.id, "user", text, msgId);

  const history = getRecentHistory(convo.id, 20);
  const lastBotMessage =
    [...history].reverse().find((m) => m.role === "assistant")?.content ?? null;

  // 4. Captura de lead por intención
  if (!convo.has_lead && hasLeadIntent(text)) {
    const existingLead = getLeadByConversationId(convo.id);
    if (!existingLead) {
      createLead(convo.id, convo.phone, convo.name);
      setConversationHasLead(convo.id, 1);
      console.log(`[lead] capturado por intención de +${phone}`);
    }
  }

  // 5. Actualizar nombre del lead si corresponde
  if (convo.has_lead && looksLikeName(text, lastBotMessage)) {
    const lead = getLeadByConversationId(convo.id);
    if (lead && !isRealName(lead.name)) {
      updateLead(lead.id, { name: text.trim() });
      console.log(`[lead] nombre actualizado → ${text.trim()}`);
    }
  }

  // 6. Verificar modo
  const fresh = getConversationById(convo.id);
  if (!fresh || fresh.mode !== "AI") {
    console.log(`[baileys] modo ${fresh?.mode ?? "?"} — sin respuesta automática`);
    return;
  }

  // 7. Debounce
  const existing = pendingResponses.get(convo.id);
  if (existing) {
    clearTimeout(existing);
    console.log(`[baileys] timer reiniciado para +${phone}`);
  }

  const hasPriorBotMessage = history.some((m) => m.role === "assistant");
  const delay = hasPriorBotMessage ? DELAY : Math.min(DELAY, 2000);

  pendingResponses.set(
    convo.id,
    setTimeout(() => {
      sendDebouncedReply(convo.id, phone).catch((err) =>
        console.error(`[baileys] error en sendDebouncedReply para +${phone}:`, err)
      );
    }, delay)
  );

  console.log(`[baileys] respuesta programada en ${delay}ms para +${phone}`);
}
