"use client";
import { useEffect, useState, useCallback } from "react";
import { QRScreen } from "./ConfigScreen";

interface Status {
  status: "connecting" | "qr" | "open" | "close";
  phone?: string | null;
}

interface Props {
  children: (status: Status) => React.ReactNode;
}

export function ConnectionGate({ children }: Props) {
  const [status, setStatus] = useState<Status | null>(null);

  const check = useCallback(() => {
    fetch("/api/connection/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ status: "close" }));
  }, []);

  useEffect(() => {
    check();
    const iv = setInterval(check, 5000);
    return () => clearInterval(iv);
  }, [check]);

  if (!status) {
    return (
      <div className="min-h-screen bg-[#111b21] flex items-center justify-center">
        <p className="text-sm text-[#8696a0]">Iniciando…</p>
      </div>
    );
  }

  if (status.status === "qr") {
    return <QRScreen onRetry={check} />;
  }

  if (status.status === "connecting" || status.status === "close") {
    return (
      <div className="min-h-screen bg-[#111b21] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#8696a0]">
            {status.status === "connecting" ? "Conectando a WhatsApp…" : "Reconectando…"}
          </p>
        </div>
      </div>
    );
  }

  return <>{children(status)}</>;
}
