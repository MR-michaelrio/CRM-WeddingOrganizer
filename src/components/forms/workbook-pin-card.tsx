"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, RefreshCw, Check, Eye, EyeOff } from "lucide-react";
import { apiFetch } from "@/lib/use-fetch";

type Props = {
  clientId: number;
  initialPin: string | null;
};

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function WorkbookPinCard({ clientId, initialPin }: Props) {
  const [pin, setPin] = useState<string | null>(initialPin);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"pin" | "link" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Origin di-set setelah mount supaya render awal (server & client) sama
  // (relatif), menghindari hydration mismatch.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const shareUrl = `${origin}/share/workbook/${clientId}`;

  const updatePin = async (next: string | null) => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        body: { workbookPin: next },
      });
      setPin(next);
      setReveal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal update PIN");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = () => updatePin(generatePin());
  const handleClear = () => {
    if (!window.confirm("Hapus PIN? Link share workbook akan tidak bisa diakses."))
      return;
    updatePin(null);
  };

  const handleCopy = async (text: string, kind: "pin" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 2000);
    } catch {
      window.prompt("Copy:", text);
    }
  };

  return (
    <div className="card-base p-6">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-gold-dark" />
          <h3 className="text-base font-semibold text-ink">PIN Akses Workbook</h3>
        </div>
        {pin ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={busy}
            className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
          >
            Hapus PIN
          </button>
        ) : null}
      </div>

      <p className="mb-4 text-xs text-ink-light">
        PIN 6 digit untuk membuka link share workbook. Bagikan PIN ke client secara
        terpisah (mis. via WhatsApp).
      </p>

      {pin ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-sm border border-line bg-cream/40 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.4em] text-ink">
              {reveal ? pin : "••••••"}
            </code>
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className="rounded-sm p-2 text-ink-light hover:bg-beige hover:text-ink"
              aria-label={reveal ? "Sembunyikan" : "Tampilkan"}
            >
              {reveal ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleCopy(pin, "pin")}
              className="rounded-sm p-2 text-ink-light hover:bg-beige hover:text-ink"
              aria-label="Copy PIN"
            >
              {copied === "pin" ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-sm border border-line bg-card px-3 py-2 text-xs">
            <span className="font-semibold uppercase tracking-wider text-ink-light">
              Link
            </span>
            <span className="flex-1 truncate font-mono text-ink">{shareUrl}</span>
            <button
              type="button"
              onClick={() => handleCopy(shareUrl, "link")}
              className="inline-flex items-center gap-1 rounded-sm bg-ink px-2 py-1 text-[11px] font-semibold text-white hover:bg-ink/90"
            >
              {copied === "link" ? (
                <>
                  <Check className="h-3 w-3" /> Tersalin
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-gold-dark hover:underline disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />
            Generate PIN baru
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy}
          className="btn btn-primary w-full justify-center"
        >
          <KeyRound className="h-4 w-4" />
          {busy ? "Membuat..." : "Generate PIN"}
        </button>
      )}

      {error && (
        <div className="mt-3 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}
    </div>
  );
}
