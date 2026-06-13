import { sendWhatsApp, sendWhatsAppHtmlPdf } from "@/lib/whatsapp";
import { buildInvoiceHtml } from "@/lib/invoice-print";
import { buildReceiptHtml } from "@/lib/receipt-print";
import { ok, badRequest, parseJson, serverError } from "@/lib/api-helpers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SendBody = {
  phone?: string;
  message?: string;
  invoiceId?: number;
  doc?: "invoice" | "receipt"; // jenis dokumen PDF untuk dilampirkan
};

function originFrom(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host") ?? "localhost:3005";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const { phone, message, invoiceId, doc = "invoice" } = await parseJson<SendBody>(req);
    if (!phone) return badRequest("Nomor telepon client kosong.");
    if (!message?.trim() && !invoiceId) return badRequest("Pesan kosong.");

    // Dengan invoiceId: bangun HTML invoice/kwitansi lalu serahkan ke WhatsApp
    // service untuk dirender jadi PDF & dikirim sebagai file + caption.
    if (invoiceId) {
      const built =
        doc === "receipt"
          ? await buildReceiptHtml(invoiceId, { forPdf: true, baseUrl: originFrom(req) })
          : await buildInvoiceHtml(invoiceId, { forPdf: true, baseUrl: originFrom(req) });
      if (!built) return badRequest("Dokumen tidak ditemukan.");

      const prefix = doc === "receipt" ? "Kwitansi" : "Invoice";
      const filename = `${prefix}-${built.number.replace(/[^\w.-]+/g, "_")}.pdf`;
      const result = await sendWhatsAppHtmlPdf(
        phone,
        built.html,
        filename,
        message?.trim() || undefined
      );
      if (!result.ok) {
        const httpStatus = result.code === "not_ready" || result.code === "service_down" ? 409 : 422;
        return NextResponse.json({ error: result.error, code: result.code }, { status: httpStatus });
      }
      return ok({ sent: true, to: result.to, attachment: filename });
    }

    // Tanpa invoiceId: kirim teks biasa.
    const result = await sendWhatsApp(phone, message!.trim());
    if (!result.ok) {
      const httpStatus = result.code === "not_ready" || result.code === "service_down" ? 409 : 422;
      return NextResponse.json({ error: result.error, code: result.code }, { status: httpStatus });
    }
    return ok({ sent: true, to: result.to });
  } catch (err) {
    return serverError(err);
  }
}
