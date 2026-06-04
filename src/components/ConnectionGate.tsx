"use client";
import { useEffect, useState, useCallback } from "react";

interface Status {
  status: "connecting" | "qr" | "open" | "close";
  phone?: string | null;
}

interface Props {
  children: (status: Status) => React.ReactNode;
}

const FALLBACK: Status = { status: "close", phone: null };

export function ConnectionGate({ children }: Props) {
  const [status, setStatus] = useState<Status>(FALLBACK);

  const check = useCallback(() => {
    fetch("/api/connection/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(FALLBACK));
  }, []);

  useEffect(() => {
    check();
    const iv = setInterval(check, 5000);
    return () => clearInterval(iv);
  }, [check]);

  return <>{children(status)}</>;
}
