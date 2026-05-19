import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type InvoiceItem = { description: string; qty: number; price: number };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatIDR(n: number): string {
  if (!Number.isFinite(n)) return "RP 0";
  return "RP " + Math.round(n).toLocaleString("id-ID");
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Short invoice number "88-09-05-26" format from the design seems to be
// derived from the issue date. We just use the invoice.number stored in DB.

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) return new Response("Invalid id", { status: 400 });

  const [invoice, setting] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        client: { select: { names: true, eventType: true, eventDate: true } },
      },
    }),
    prisma.setting.findUnique({ where: { id: 1 } }),
  ]);

  if (!invoice) return new Response("Invoice not found", { status: 404 });

  const items = (invoice.items as InvoiceItem[] | null) ?? [];
  const subtotal = items.reduce(
    (s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0),
    0
  );
  const total = subtotal > 0 ? subtotal : Number(invoice.amount);
  const dueAmount = Number(invoice.amount);
  const pct = total > 0 ? Math.round((dueAmount / total) * 100) : 0;
  const dueLabel =
    invoice.type === "dp"
      ? `DP${pct > 0 && pct < 100 ? ` ${pct}%` : ""}`
      : "PELUNASAN";

  const brandName = setting?.brandName || "eclipse.sangjit";
  const brandTagline = setting?.brandTagline || "JA BO DE TA BEK";
  const brandLogoUrl = setting?.brandLogoUrl || "";
  const bankName = setting?.bankName || "BCA";
  const bankAccount = setting?.bankAccount || "";
  const bankAccountName = setting?.bankAccountName || "";
  const signatoryName = setting?.signatoryName || "";
  const signatureUrl = setting?.signatureUrl || "";
  const thankYou = setting?.thankYouMessage || "TERIMAKASIH ATAS KEPERCAYAAN ANDA";

  const itemRowsHtml =
    items.length === 0
      ? `<tr><td colspan="4" class="empty">Belum ada line items. Tambah di form Edit Invoice.</td></tr>`
      : items
          .map(
            (it) => `
            <tr>
              <td class="desc">${escapeHtml(it.description || "")}</td>
              <td class="num">${formatIDR(Number(it.price) || 0)}</td>
              <td class="num">${Number(it.qty) > 1 ? Number(it.qty) : ""}</td>
              <td class="num">${formatIDR((Number(it.qty) || 0) * (Number(it.price) || 0))}</td>
            </tr>`
          )
          .join("");

  // Fill remaining table rows so the grey block looks like the design
  const minRows = 5;
  const padding =
    items.length < minRows
      ? Array.from({ length: minRows - items.length })
          .map(() => `<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>`)
          .join("")
      : "";

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(invoice.number)} — ${escapeHtml(invoice.client.names)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Italiana&family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #f5f5f5; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #111;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 22mm 18mm;
      margin: 24px auto;
      background: white;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      position: relative;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 18px;
      border-bottom: 1px solid #111;
    }
    .header h1 {
      font-family: 'Helvetica World', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 68px;
      letter-spacing: 1px;
      font-weight: 500;
      margin: 0;
      color: #111;
      line-height: 1;
    }
    .brand { text-align: right; }
    .brand .logo-img { max-height: 96px; max-width: 320px; object-fit: contain; display: inline-block; }
    .brand .brand-name {
      font-family: 'Italiana', 'Cormorant Garamond', Georgia, serif;
      font-size: 30px;
      color: #B43A38;
      letter-spacing: 0.5px;
      line-height: 1;
    }
    .brand .tagline {
      margin-top: 4px;
      font-size: 11px;
      color: #888;
      letter-spacing: 6px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }
    .brand .tagline::before {
      content: '';
      width: 28px;
      height: 1px;
      background: #B43A38;
      display: inline-block;
    }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 28px;
    }
    .meta .label {
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .meta .value {
      font-size: 13px;
      color: #333;
    }
    .meta-right { text-align: right; }
    .meta-right .block + .block { margin-top: 12px; }
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-top: 28px;
    }
    table.items thead th {
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
      font-weight: 700;
      padding: 12px 14px;
      text-align: left;
      color: #111;
    }
    table.items thead th.num { text-align: right; }
    table.items tbody td {
      padding: 16px 14px;
      font-size: 13px;
      background: #ebebeb;
      vertical-align: top;
    }
    table.items tbody td.desc {
      font-weight: 600;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    table.items tbody td.num { text-align: right; }
    table.items tbody td.empty {
      text-align: center;
      font-style: italic;
      color: #888;
      background: #ebebeb;
    }
    table.items tbody tr:first-child td:first-child { border-top-left-radius: 2px; }
    .bottom {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 32px;
      margin-top: 22px;
    }
    .pembayaran .head {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .pembayaran .name { font-weight: 700; font-size: 16px; }
    .pembayaran .bank { font-weight: 700; font-size: 16px; color: #B43A38; margin-top: 4px; }
    .totals { text-align: right; }
    .totals .row {
      display: flex;
      justify-content: flex-end;
      align-items: baseline;
      gap: 24px;
    }
    .totals .row + .row { margin-top: 8px; }
    .totals .label { font-size: 14px; font-weight: 700; letter-spacing: 0.5px; }
    .totals .label.dim { font-weight: 500; color: #444; }
    .totals .amount { font-size: 14px; font-weight: 700; min-width: 140px; }
    .totals .amount.dim { font-weight: 500; color: #444; }
    .event-note {
      margin-top: 16px;
      font-size: 12px;
      padding-left: 16px;
      position: relative;
    }
    .event-note::before {
      content: '\\2022';
      position: absolute; left: 0; top: 0;
      font-size: 14px;
    }
    .footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-top: 96px;
    }
    .footer .thanks {
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.5px;
      line-height: 1.6;
      align-self: end;
    }
    .footer .sign {
      text-align: center;
    }
    .footer .sign img {
      max-height: 90px;
      max-width: 180px;
      object-fit: contain;
    }
    .footer .sign .line {
      border-top: 1px solid #111;
      margin-top: 4px;
      padding-top: 6px;
      font-size: 13px;
    }
    .actions {
      position: fixed; top: 16px; right: 16px;
      display: flex; gap: 8px;
      background: white; padding: 8px;
      border: 1px solid #e0e0e0; border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,.1);
      z-index: 10;
    }
    .actions button {
      background: #111;
      color: white; border: 0; cursor: pointer;
      padding: 8px 14px; border-radius: 6px;
      font-size: 13px; font-weight: 600;
    }
    .actions button.secondary {
      background: white; color: #111;
      border: 1px solid #e0e0e0;
    }
    @media print {
      html, body { background: white; }
      .page { box-shadow: none; margin: 0; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Print</button>
    <button class="secondary" onclick="window.close()">Close</button>
  </div>

  <div class="page">
    <div class="header">
      <h1>INVOICE</h1>
      <div class="brand">
        ${
          brandLogoUrl
            ? `<img class="logo-img" src="${escapeHtml(brandLogoUrl)}" alt="${escapeHtml(brandName)}" />`
            : `<div class="brand-name">${escapeHtml(brandName)}</div>`
        }
      </div>
    </div>

    <div class="meta">
      <div>
        <div class="label">KEPADA :</div>
        <div class="value">${escapeHtml(invoice.client.names)}</div>
      </div>
      <div class="meta-right">
        <div class="block">
          <div class="label">TANGGAL :</div>
          <div class="value">${escapeHtml(formatLongDate(new Date(invoice.issuedDate)))}</div>
        </div>
        <div class="block">
          <div class="label">NO INVOICE :</div>
          <div class="value">${escapeHtml(invoice.number)}</div>
        </div>
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th>KETERANGAN</th>
          <th class="num">HARGA</th>
          <th class="num">JML</th>
          <th class="num">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}
        ${padding}
      </tbody>
    </table>

    <div class="bottom">
      <div class="pembayaran">
        <div class="head">PEMBAYARAN :</div>
        ${bankAccountName ? `<div class="name">A/n ${escapeHtml(bankAccountName)}</div>` : ""}
        ${
          bankAccount
            ? `<div class="bank">No Rek ${escapeHtml(bankName)} : ${escapeHtml(bankAccount)}</div>`
            : ""
        }
        ${
          invoice.eventLabel
            ? `<div class="event-note">${escapeHtml(invoice.eventLabel)}</div>`
            : ""
        }
      </div>
      <div class="totals">
        <div class="row">
          <span class="label">TOTAL</span>
          <span class="amount">${formatIDR(total)}</span>
        </div>
        <div class="row">
          <span class="label dim">${escapeHtml(dueLabel)}</span>
          <span class="amount dim">${formatIDR(dueAmount)}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="thanks">${escapeHtml(thankYou).replace(/\n/g, "<br>")}</div>
      <div class="sign">
        ${signatureUrl ? `<img src="${escapeHtml(signatureUrl)}" alt="signature" />` : "&nbsp;"}
        <div class="line">${escapeHtml(signatoryName || "")}</div>
      </div>
    </div>
  </div>

  <script>
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setTimeout(() => window.print(), 300));
    } else {
      setTimeout(() => window.print(), 500);
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
