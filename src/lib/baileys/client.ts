import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";
import path from "node:path";
import fs from "node:fs";

const AUTH_DIR =
  process.env.BAILEYS_AUTH_DIR ||
  path.join(process.cwd(), "data", "baileys_auth");

const logger = pino({ level: "silent" });

// ── Estado global ───────────────────────────────────────────

type ConnStatus = "connecting" | "qr" | "open" | "close";

const state: {
  status: ConnStatus;
  qr: string | null;
  phone: string | null;
  sock: WASocket | null;
} = { status: "connecting", qr: null, phone: null, sock: null };

export type MessageHandler = (
  phone: string,
  text: string,
  name: string | null,
  msgId: string
) => Promise<void>;

// ── API pública ─────────────────────────────────────────────

export function getConnectionState() {
  return { status: state.status, qr: state.qr, phone: state.phone };
}

export async function sendTextMessage(
  phone: string,
  text: string
): Promise<{ wa_message_id: string }> {
  if (!state.sock || state.status !== "open") {
    throw new Error("WhatsApp no conectado");
  }
  const jid = `${phone}@s.whatsapp.net`;
  const result = await state.sock.sendMessage(jid, { text });
  return { wa_message_id: result?.key?.id ?? `local-${Date.now()}` };
}

export async function logout(): Promise<void> {
  if (state.sock) {
    try { await state.sock.logout(); } catch { /* ignorar */ }
    state.sock = null;
  }
  state.status = "close";
  state.qr = null;
  state.phone = null;
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  }
}

// ── Arranque ────────────────────────────────────────────────

let _started = false;

export async function startBaileys(handler: MessageHandler): Promise<void> {
  if (_started) return;
  _started = true;

  await _connect(handler);
}

async function _connect(handler: MessageHandler): Promise<void> {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version: [number, number, number] = [2, 3000, 1023207250];
  try {
    const latest = await Promise.race([
      fetchLatestBaileysVersion(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
    ]);
    version = latest.version;
  } catch {
    console.log("[baileys] usando versión hardcoded por timeout/error de red");
  }

  const sock = makeWASocket({
    version,
    auth: authState,
    logger,
    printQRInTerminal: false,
    browser: ["Natación Riveros", "Chrome", "1.0"],
  });

  state.sock = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      state.status = "qr";
      state.qr = qr;
      console.log("[baileys] QR listo para escanear");
    }

    if (connection === "open") {
      state.status = "open";
      state.qr = null;
      state.phone = sock.user?.id?.split(":")[0] ?? null;
      console.log(`[baileys] Conectado → ${state.phone}`);
    }

    if (connection === "close") {
      state.status = "close";
      state.qr = null;
      state.sock = null;
      const code = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      console.log(`[baileys] Conexión cerrada (code=${code}), loggedOut=${loggedOut}`);

      if (loggedOut) {
        // Borrar auth para forzar QR en el próximo arranque
        if (fs.existsSync(AUTH_DIR)) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        }
      }

      // Reconectar siempre (salvo logout intencional vía API)
      _started = false;
      setTimeout(() => {
        _started = false;
        _connect(handler).catch((e) =>
          console.error("[baileys] error al reconectar:", e)
        );
      }, 5000);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const jid = msg.key.remoteJid ?? "";
      // Ignorar grupos
      if (jid.includes("@g.us") || jid.includes("@broadcast")) continue;

      const text =
        msg.message.conversation ??
        msg.message.extendedTextMessage?.text ??
        msg.message.ephemeralMessage?.message?.conversation;
      if (!text?.trim()) continue;

      const phone = jid.replace("@s.whatsapp.net", "");
      const name = msg.pushName ?? null;
      const msgId = msg.key.id ?? `${Date.now()}`;

      await handler(phone, text.trim(), name, msgId).catch((e) =>
        console.error(`[baileys] error en handler para ${phone}:`, e)
      );
    }
  });
}
