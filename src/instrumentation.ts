export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBaileys } = await import("./lib/baileys/client");
    const { handleIncomingMessage } = await import("./lib/baileys/handler");
    const { startBackupScheduler } = await import("./lib/scheduler");

    startBackupScheduler();
    // No bloqueamos el arranque de Next.js — Baileys conecta en background
    startBaileys(handleIncomingMessage).catch((e) =>
      console.error("[instrumentation] error al iniciar Baileys:", e)
    );
  }
}
