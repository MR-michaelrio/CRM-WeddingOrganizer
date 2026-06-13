"use client";

import { useState } from "react";
import {
  BookOpen,
  CalendarClock,
  CalendarPlus,
  FileText,
  Receipt,
  Send,
  Video,
} from "lucide-react";
import { apiFetch } from "@/lib/use-fetch";
import {
  invoiceMessage,
  paymentReminderMessage,
  meetingMessage,
  workbookMessage,
  receiptMessage,
  type WaTemplateCtx,
  type WaInvoice,
} from "@/lib/whatsapp-templates";

type Props = {
  phone: string | null;
  ctx: WaTemplateCtx;
  clientId: number;
  invoice: (WaInvoice & { id: number }) | null; // invoice DP untuk "Kirim Invoice"
  pelunasanInvoiceId: number | null; // dilampirkan di pengingat pelunasan
  outstanding: number;
  pelunasanDue: string | null;
  workbookPin: string | null;
  dpReceiptId: number | null; // id invoice DP bila sudah lunas → Kwitansi DP
  pelunasanReceiptId: number | null; // id invoice pelunasan bila lunas → Kwitansi Pelunasan
};

type Result = { kind: "success" | "error"; message: string } | null;
type SendOpts = { invoiceId?: number; doc?: "invoice" | "receipt" };

function defaultMeetingLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function WhatsAppActions({
  phone,
  ctx,
  clientId,
  invoice,
  pelunasanInvoiceId,
  outstanding,
  pelunasanDue,
  workbookPin,
  dpReceiptId,
  pelunasanReceiptId,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingAt, setMeetingAt] = useState(defaultMeetingLocal());
  const [pin, setPin] = useState<string | null>(workbookPin);

  const hasPhone = Boolean(phone);

  async function send(key: string, message: string, opts: SendOpts = {}) {
    if (!phone) return;
    setBusy(key);
    setResult(null);
    try {
      await apiFetch("/api/whatsapp/send", {
        method: "POST",
        body: { phone, message, invoiceId: opts.invoiceId, doc: opts.doc },
      });
      setResult({
        kind: "success",
        message: opts.invoiceId ? "File PDF terkirim ke WhatsApp ✓" : "Pesan terkirim ✓",
      });
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof Error ? err.message : "Gagal mengirim.",
      });
    } finally {
      setBusy(null);
    }
  }

  function workbookLink(): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/share/workbook/${clientId}`;
  }

  // Kirim link workbook; bikin PIN otomatis kalau belum ada.
  async function sendWorkbook() {
    if (!phone) return;
    setBusy("workbook");
    setResult(null);
    try {
      let usePin = pin;
      if (!usePin) {
        usePin = String(Math.floor(100000 + Math.random() * 900000));
        await apiFetch(`/api/clients/${clientId}`, {
          method: "PATCH",
          body: { workbookPin: usePin },
        });
        setPin(usePin);
      }
      await apiFetch("/api/whatsapp/send", {
        method: "POST",
        body: { phone, message: workbookMessage(ctx, workbookLink(), usePin) },
      });
      setResult({ kind: "success", message: `Link workbook + PIN (${usePin}) terkirim ✓` });
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof Error ? err.message : "Gagal mengirim.",
      });
    } finally {
      setBusy(null);
    }
  }

  // Buat Google Meet (tersimpan di Calendar) lalu kirim linknya via WA.
  async function createAndSendMeet() {
    if (!phone) return;
    setBusy("meet");
    setResult(null);
    try {
      const startAt = new Date(meetingAt);
      if (Number.isNaN(startAt.getTime())) throw new Error("Tanggal/jam meeting tidak valid.");
      const event = await apiFetch<{ meetLink?: string | null }>("/api/events", {
        method: "POST",
        body: {
          title: `Meeting — ${ctx.clientNames}`,
          type: "meeting",
          startAt: startAt.toISOString(),
          clientId,
          createGoogleMeet: true,
        },
      });
      if (!event.meetLink)
        throw new Error("Meet link gagal dibuat. Pastikan Google terhubung di Settings.");
      await apiFetch("/api/whatsapp/send", {
        method: "POST",
        body: { phone, message: meetingMessage(ctx, event.meetLink) },
      });
      setResult({ kind: "success", message: "Google Meet dibuat & link terkirim ✓" });
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof Error ? err.message : "Gagal membuat meeting.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!hasPhone && (
        <div className="rounded-md border border-dashed border-line bg-cream/50 px-3 py-2 text-xs italic text-ink-light">
          Nomor telepon client belum diisi. Lengkapi dulu di data client.
        </div>
      )}

      {result && (
        <div
          className={`rounded-md border p-2.5 text-xs ${
            result.kind === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {result.message}
          {result.kind === "error" && (
            <>
              {" "}
              <a href="/settings" className="font-semibold underline">
                Cek koneksi di Settings
              </a>
            </>
          )}
        </div>
      )}

      <button
        onClick={() =>
          invoice && send("invoice", invoiceMessage(ctx, invoice), { invoiceId: invoice.id })
        }
        disabled={!hasPhone || !invoice || busy !== null}
        className="btn btn-primary justify-start text-sm disabled:opacity-50"
      >
        <FileText className="h-4 w-4" />
        {busy === "invoice" ? "Mengirim file…" : "Kirim Invoice (PDF)"}
        {!invoice && <span className="text-[11px] opacity-70">(tidak ada invoice)</span>}
      </button>

      <button
        onClick={() =>
          send("reminder", paymentReminderMessage(ctx, outstanding, pelunasanDue), {
            invoiceId: pelunasanInvoiceId ?? undefined,
          })
        }
        disabled={!hasPhone || outstanding <= 0 || busy !== null}
        className="btn btn-secondary justify-start text-sm disabled:opacity-50"
      >
        <CalendarClock className="h-4 w-4" />
        {busy === "reminder"
          ? "Mengirim…"
          : pelunasanInvoiceId
            ? "Pengingat Pelunasan + PDF"
            : "Pengingat Pelunasan"}
        {outstanding <= 0 && <span className="text-[11px] opacity-70">(lunas)</span>}
      </button>

      <button
        onClick={() => dpReceiptId && send("kw-dp", receiptMessage(ctx, "dp"), { invoiceId: dpReceiptId, doc: "receipt" })}
        disabled={!hasPhone || !dpReceiptId || busy !== null}
        className="btn btn-secondary justify-start text-sm disabled:opacity-50"
      >
        <Receipt className="h-4 w-4" />
        {busy === "kw-dp" ? "Mengirim…" : "Kwitansi DP (PDF)"}
        {!dpReceiptId && <span className="text-[11px] opacity-70">(DP belum lunas)</span>}
      </button>

      <button
        onClick={() =>
          pelunasanReceiptId &&
          send("kw-pelunasan", receiptMessage(ctx, "pelunasan"), {
            invoiceId: pelunasanReceiptId,
            doc: "receipt",
          })
        }
        disabled={!hasPhone || !pelunasanReceiptId || busy !== null}
        className="btn btn-secondary justify-start text-sm disabled:opacity-50"
      >
        <Receipt className="h-4 w-4" />
        {busy === "kw-pelunasan" ? "Mengirim…" : "Kwitansi Pelunasan (PDF)"}
        {!pelunasanReceiptId && <span className="text-[11px] opacity-70">(belum lunas)</span>}
      </button>

      <button
        onClick={sendWorkbook}
        disabled={!hasPhone || busy !== null}
        className="btn btn-secondary justify-start text-sm disabled:opacity-50"
      >
        <BookOpen className="h-4 w-4" />
        {busy === "workbook" ? "Mengirim…" : "Kirim Link Workbook + PIN"}
      </button>

      {/* ---- Meeting: shortcut Google Meet + kirim ---- */}
      <div className="rounded-md border border-line bg-cream/40 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-light">
          <Video className="h-3.5 w-3.5" /> Meeting Google Meet
        </div>
        <input
          type="datetime-local"
          value={meetingAt}
          onChange={(e) => setMeetingAt(e.target.value)}
          className="mb-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-gold-dark"
        />
        <button
          onClick={createAndSendMeet}
          disabled={!hasPhone || busy !== null}
          className="btn btn-primary w-full justify-center text-sm disabled:opacity-50"
        >
          <CalendarPlus className="h-4 w-4" />
          {busy === "meet" ? "Membuat…" : "Buat Meet & Kirim"}
        </button>
        <p className="mt-1.5 text-[11px] text-ink-light">
          Membuat Google Meet + event kalender, lalu kirim linknya. Perlu Google terhubung di
          Settings.
        </p>

        <div className="my-2.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-ink-light">
          <span className="h-px flex-1 bg-line" /> atau link manual <span className="h-px flex-1 bg-line" />
        </div>
        <input
          type="url"
          value={meetingLink}
          onChange={(e) => setMeetingLink(e.target.value)}
          placeholder="https://meet.google.com/…"
          className="mb-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-gold-dark"
        />
        <button
          onClick={() => send("meeting", meetingMessage(ctx, meetingLink.trim()))}
          disabled={!hasPhone || !meetingLink.trim() || busy !== null}
          className="btn btn-secondary w-full justify-center text-sm disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {busy === "meeting" ? "Mengirim…" : "Kirim Link Manual"}
        </button>
      </div>
    </div>
  );
}
