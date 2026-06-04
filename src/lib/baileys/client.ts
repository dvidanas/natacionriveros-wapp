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

const STATE_FILE = path.join(process.cwd(), "data", "baileys_conn.json");

const logger = pino({ level: "silent" });

type ConnStatus = "connecting" | "qr" | "open" | "close";

interface PersistedState {
  status: ConnStatus;
  qr: string | null;
  phone: string | null;
  updatedAt: number;
}

// Estado en memoria (solo válido en el proceso que corre Baileys)
const mem: { status: ConnStatus; qr: string | null; phone: string | null; sock: WASocket | null } =
  { status: "connecting", qr: null, phone: null, sock: null };

function writeState() {
  try {
    const data: PersistedState = {
      status: mem.status,
      qr: mem.qr,
      phone: mem.phone,
      updatedAt: Date.now(),
    };
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(data));
  } catch {}
}

// Leído por rutas API (pueden correr en distinto módulo en Next.js prod)
export function getConnectionState(): { status: ConnStatus; qr: string | null; phone: string | null } {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const data: PersistedState = JSON.parse(raw);
    // Si el archivo tiene más de 90s de antigüedad, considerar desconectado
    if (Date.now() - data.updatedAt > 90_000) {
      return { status: "close", qr: null, phone: null };
    }
    return { status: data.status, qr: data.qr, phone: data.phone };
  } catch {
    // Primera vez o error de lectura: devolver estado en memoria
    return { status: mem.status, qr: mem.qr, phone: mem.phone };
  }
}

export type MessageHandler = (
  phone: string,
  text: string,
  name: string | null,
  msgId: string
) => Promise<void>;

export async function sendTextMessage(
  phone: string,
  text: string
): Promise<{ wa_message_id: string }> {
  if (!mem.sock || mem.status !== "open") {
    throw new Error("WhatsApp no conectado");
  }
  const jid = `${phone}@s.whatsapp.net`;
  const result = await mem.sock.sendMessage(jid, { text });
  return { wa_message_id: result?.key?.id ?? `local-${Date.now()}` };
}

export async function logout(): Promise<void> {
  if (mem.sock) {
    try { await mem.sock.logout(); } catch { /* ignorar */ }
    mem.sock = null;
  }
  mem.status = "close";
  mem.qr = null;
  mem.phone = null;
  writeState();
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

  mem.sock = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      mem.status = "qr";
      mem.qr = qr;
      writeState();
      console.log("[baileys] QR listo para escanear");
    }

    if (connection === "open") {
      mem.status = "open";
      mem.qr = null;
      mem.phone = sock.user?.id?.split(":")[0] ?? null;
      writeState();
      console.log(`[baileys] Conectado → ${mem.phone}`);
    }

    if (connection === "close") {
      mem.status = "close";
      mem.qr = null;
      mem.sock = null;
      writeState();
      const code = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      console.log(`[baileys] Conexión cerrada (code=${code}), loggedOut=${loggedOut}`);

      if (loggedOut) {
        if (fs.existsSync(AUTH_DIR)) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        }
      }

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
