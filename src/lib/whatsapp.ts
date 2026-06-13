// Klien HTTP ke WhatsApp Eclipse service (proses Node terpisah yang meng-host
// whatsapp-web.js). Website TIDAK lagi menjalankan whatsapp-web.js/Chromium
// sendiri — semua pengiriman lewat service ini supaya tetap ringan.
//
// Konfigurasi:
//   WHATSAPP_API_URL   — base URL service (default http://localhost:3010)
//   WHATSAPP_API_TOKEN — shared token opsional (header x-api-key)

const BASE_URL = (process.env.WHATSAPP_API_URL || "http://localhost:3010").replace(/\/+$/, "");
const API_TOKEN = process.env.WHATSAPP_API_TOKEN || "";

export type WhatsAppStatus =
  | "idle"
  | "initializing"
  | "qr"
  | "authenticated"
  | "ready"
  | "auth_failure"
  | "disconnected";

export type WhatsAppStatusResponse = {
  status: WhatsAppStatus;
  qr: string | null;
  me: string | null;
  error: string | null;
};

export type SendResult =
  | { ok: true; to: string; attachment?: string }
  | {
      ok: false;
      error: string;
      code: "not_ready" | "invalid_number" | "not_registered" | "send_failed" | "service_down";
    };

export type WhatsAppMedia = { data: string; mimetype: string; filename: string };

function headers(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_TOKEN) h["x-api-key"] = API_TOKEN;
  return h;
}

// Wrapper fetch ke service. `service_down` dipakai bila service tak bisa
// dihubungi (mis. belum dijalankan) — diperlakukan seperti not_ready (409).
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const err = new Error(data?.error || `${res.status} ${res.statusText}`) as Error & {
      status: number;
      payload: unknown;
    };
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data as T;
}

export async function getWhatsAppStatus(): Promise<WhatsAppStatusResponse> {
  try {
    return await call<WhatsAppStatusResponse>("/status");
  } catch {
    // Service belum jalan → tampilkan sebagai "disconnected" supaya UI tidak error.
    return {
      status: "disconnected",
      qr: null,
      me: null,
      error: "WhatsApp service tidak dapat dihubungi. Pastikan service di WhatsAppEclipse berjalan.",
    };
  }
}

// Mengubah error fetch dari service menjadi SendResult yang konsisten.
function toSendError(err: unknown): Extract<SendResult, { ok: false }> {
  const e = err as { payload?: { error?: string; code?: string }; message?: string };
  const code = (e.payload?.code as Extract<SendResult, { ok: false }>["code"]) || "service_down";
  const error =
    e.payload?.error ||
    e.message ||
    "WhatsApp service tidak dapat dihubungi. Pastikan service berjalan.";
  return { ok: false, code, error };
}

export async function sendWhatsApp(phone: string, message: string): Promise<SendResult> {
  try {
    const r = await call<{ to: string }>("/send", {
      method: "POST",
      body: JSON.stringify({ phone, message }),
    });
    return { ok: true, to: r.to };
  } catch (err) {
    return toSendError(err);
  }
}

/** Kirim PDF hasil render HTML (invoice/kwitansi) dengan caption opsional. */
export async function sendWhatsAppHtmlPdf(
  phone: string,
  html: string,
  filename: string,
  caption?: string
): Promise<SendResult> {
  try {
    const r = await call<{ to: string; attachment: string }>("/send-media", {
      method: "POST",
      body: JSON.stringify({ phone, html, filename, caption }),
    });
    return { ok: true, to: r.to, attachment: r.attachment };
  } catch (err) {
    return toSendError(err);
  }
}

/** Kirim media base64 mentah (mis. file non-PDF) dengan caption opsional. */
export async function sendWhatsAppMedia(
  phone: string,
  media: WhatsAppMedia,
  caption?: string
): Promise<SendResult> {
  try {
    const r = await call<{ to: string; attachment: string }>("/send-media", {
      method: "POST",
      body: JSON.stringify({ phone, ...media, caption }),
    });
    return { ok: true, to: r.to, attachment: r.attachment };
  } catch (err) {
    return toSendError(err);
  }
}

export async function logoutWhatsApp(): Promise<void> {
  await call("/logout", { method: "POST" });
}
