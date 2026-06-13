"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LogOut, MessageCircle, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/use-fetch";

type WaStatus = {
  status:
    | "idle"
    | "initializing"
    | "qr"
    | "authenticated"
    | "ready"
    | "auth_failure"
    | "disconnected";
  qr: string | null;
  me: string | null;
  error: string | null;
};

const LABEL: Record<WaStatus["status"], string> = {
  idle: "Belum dimulai",
  initializing: "Menyiapkan koneksi…",
  qr: "Menunggu scan QR",
  authenticated: "Terautentikasi, memuat…",
  ready: "Terhubung",
  auth_failure: "Gagal autentikasi",
  disconnected: "Terputus",
};

export function WhatsAppCard() {
  const [data, setData] = useState<WaStatus | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    load();
    timer.current = setInterval(load, 3000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const handleLogout = async () => {
    if (!confirm("Putuskan koneksi WhatsApp? Perlu scan QR ulang nanti.")) return;
    setLoggingOut(true);
    try {
      await apiFetch("/api/whatsapp/logout", { method: "POST" });
      await load();
    } finally {
      setLoggingOut(false);
    }
  };

  const status = data?.status ?? "idle";
  const connected = status === "ready";

  return (
    <div className="card-base p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold-light text-gold-dark">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-ink">WhatsApp</h3>
          <p className="text-[13px] text-ink-light">
            Hubungkan WhatsApp untuk kirim invoice, pengingat pelunasan & link meeting
            langsung dari detail client.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            connected
              ? "bg-success/10 text-success"
              : status === "auth_failure" || status === "disconnected"
                ? "bg-danger/10 text-danger"
                : "bg-card text-ink-medium"
          }`}
        >
          {LABEL[status]}
        </span>
      </div>

      {data?.error && !connected && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {data.error}
        </div>
      )}

      {connected ? (
        <div className="rounded-md border border-success/30 bg-success/5 p-4">
          <div className="mb-3 flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <div className="flex-1">
              <div className="font-semibold text-ink">
                {data?.me ? `+${data.me}` : "WhatsApp terhubung"}
              </div>
              <div className="text-xs text-ink-light">Siap mengirim pesan ke client.</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn btn-secondary text-danger disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "Memutus…" : "Putuskan"}
          </button>
        </div>
      ) : data?.qr ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-line bg-cream/40 p-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.qr} alt="WhatsApp QR" className="h-56 w-56 rounded bg-white p-2" />
          <p className="max-w-sm text-sm text-ink-light">
            Buka <strong>WhatsApp → Perangkat Tertaut → Tautkan Perangkat</strong> di HP, lalu
            scan QR ini. QR refresh otomatis.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-line bg-cream/40 p-6 text-center">
          <RefreshCw className="h-6 w-6 animate-spin text-ink-light" />
          <p className="text-sm text-ink-light">{LABEL[status]}</p>
          <button onClick={load} className="btn btn-secondary text-sm">
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
