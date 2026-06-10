"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

type Props = {
  clientId: number;
  clientName: string;
  eventType: string;
  eventDateLabel: string;
};

export function PinForm({
  clientId,
  clientName,
  eventType,
  eventDateLabel,
}: Props) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setDigit = (idx: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    setDigits((arr) => {
      const next = [...arr];
      next[idx] = v;
      return next;
    });
    if (v && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKey = (idx: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      refs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!txt) return;
    e.preventDefault();
    const next = txt.split("").concat(Array(6).fill("")).slice(0, 6);
    setDigits(next);
    const lastFilled = Math.min(txt.length, 6) - 1;
    refs.current[Math.min(lastFilled + 1, 5)]?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = digits.join("");
    if (pin.length !== 6) {
      setError("Masukkan 6 digit PIN");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/share/workbook/${clientId}/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "PIN salah");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "PIN salah");
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-card p-8 shadow-pop">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold-dark">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">
            Akses Workbook
          </h1>
          <p className="mt-2 text-sm text-ink-light">
            Masukkan PIN 6 digit untuk melihat workbook
          </p>
          <div className="mt-4 rounded-sm bg-cream/60 px-4 py-2 text-sm">
            <div className="font-semibold text-ink">{clientName}</div>
            <div className="text-xs text-ink-light">
              {eventType} · {eventDateLabel}
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex justify-center gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={handleKey(i)}
                onPaste={i === 0 ? handlePaste : undefined}
                autoFocus={i === 0}
                className="h-14 w-12 rounded-md border-2 border-line bg-white text-center font-mono text-2xl font-bold text-ink focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
            ))}
          </div>
          {error && (
            <div className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-center text-xs text-danger">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full justify-center"
          >
            {submitting ? "Memverifikasi..." : "Buka Workbook"}
          </button>
        </form>
      </div>
    </div>
  );
}
