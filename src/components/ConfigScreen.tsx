"use client";
import { useEffect, useState, useCallback } from "react";

interface Props {
  onRetry: () => void;
}

export function QRScreen({ onRetry }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQR = useCallback(async () => {
    try {
      const res = await fetch("/api/connection/qr");
      if (res.ok) {
        const data = await res.json();
        setQr(data.qr ?? null);
      } else {
        setQr(null);
      }
    } catch {
      setQr(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQR();
    const iv = setInterval(() => {
      onRetry(); // Recheck connection status
      fetchQR();
    }, 5000);
    return () => clearInterval(iv);
  }, [fetchQR, onRetry]);

  return (
    <div className="min-h-screen bg-[#111b21] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-[#202c33] rounded-2xl overflow-hidden shadow-xl border border-[#2a3942]">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#00a884]/15 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#00a884]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-white">Conectar WhatsApp</h2>
            <p className="text-sm text-[#8696a0] mt-1">
              Escaneá el QR con tu teléfono
            </p>
          </div>

          {/* QR */}
          <div className="px-6 pb-6">
            <div className="bg-white rounded-xl p-4 flex items-center justify-center aspect-square">
              {loading ? (
                <div className="text-sm text-gray-400">Cargando QR…</div>
              ) : qr ? (
                <img src={qr} alt="QR WhatsApp" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">QR no disponible</p>
                  <p className="text-xs text-gray-400">Esperando al servidor…</p>
                </div>
              )}
            </div>

            <ol className="mt-4 space-y-2 text-sm text-[#8696a0]">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#2a3942] text-[#00a884] text-xs flex items-center justify-center font-semibold">1</span>
                <span>Abrí WhatsApp en tu teléfono</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#2a3942] text-[#00a884] text-xs flex items-center justify-center font-semibold">2</span>
                <span>Menú → Dispositivos vinculados → Vincular dispositivo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#2a3942] text-[#00a884] text-xs flex items-center justify-center font-semibold">3</span>
                <span>Apuntá la cámara al QR de arriba</span>
              </li>
            </ol>
          </div>
        </div>

        <p className="text-center text-xs text-[#8696a0] mt-4">
          El QR se actualiza automáticamente cada 30 segundos
        </p>
      </div>
    </div>
  );
}
