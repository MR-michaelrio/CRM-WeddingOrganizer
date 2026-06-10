import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type InvoiceItem = { description: string; qty: number; price: number; details?: string };

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

  // Untuk perhitungan persen DP, total ideal = subtotal items kalau ada,
  // kalau tidak fallback ke (dueAmount + sibling amount).
  const dueAmount = Number(invoice.amount);

  // Cari invoice pasangan (DP atau Pelunasan) untuk client yang sama.
  const sibling = await prisma.invoice.findFirst({
    where: {
      clientId: invoice.clientId,
      type: invoice.type === "dp" ? "pelunasan" : "dp",
    },
    orderBy: [{ paidAt: "desc" }, { issuedDate: "desc" }],
    select: { number: true, amount: true, paidAt: true, status: true, issuedDate: true },
  });

  // siblingDp = invoice DP-nya (kalau yang sedang dirender Pelunasan).
  const siblingDp = invoice.type === "pelunasan" ? sibling : null;
  const dpPaid = siblingDp ? Number(siblingDp.amount) : 0;
  const dpIsPaid = siblingDp?.status === "paid";

  const totalCandidate =
    subtotal > 0
      ? subtotal
      : invoice.type === "dp"
        ? dueAmount + (sibling ? Number(sibling.amount) : 0)
        : dueAmount + dpPaid;
  const total = totalCandidate;

  // Persen DP atas total paket.
  const dpAmountForPct = invoice.type === "dp" ? dueAmount : dpPaid;
  const pct =
    total > 0 && dpAmountForPct > 0
      ? Math.round((dpAmountForPct / total) * 100)
      : 0;
  const pctSuffix = pct > 0 && pct < 100 ? ` ${pct}%` : "";

  const invoicePaid = invoice.status === "paid";
  // dueLabel = label di kolom totals untuk baris "DP / PELUNASAN" pada
  // invoice yang sedang dirender.
  const dueLabel =
    invoice.type === "dp"
      ? invoicePaid
        ? `LUNAS${pctSuffix}`
        : `DP${pctSuffix}`
      : invoicePaid
        ? "LUNAS"
        : "PELUNASAN";

  // Status badge di header.
  const headerStatus =
    invoice.type === "dp"
      ? invoicePaid
        ? `LUNAS${pctSuffix}`
        : `DP${pctSuffix}`
      : invoicePaid
        ? "LUNAS"
        : "PELUNASAN";
  // Untuk DP: sisa = total - DP. Untuk Pelunasan: sisa = nominal tagihan ini
  // (yang harus dilunasi). Total mengasumsikan subtotal items merepresentasi
  // total paket.
  const sisaPembayaran =
    invoice.type === "dp" ? Math.max(0, total - dueAmount) : dueAmount;

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
          .map((it) => {
            const details = String(it.details || "")
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter((l) => l.length > 0);
            const qtyNum = Number(it.qty) || 0;
            const jmlCell =
              details.length > 0
                ? `<ul class="rincian">${details
                    .map((d) => `<li>${escapeHtml(d)}</li>`)
                    .join("")}</ul>`
                : qtyNum > 1
                  ? String(qtyNum)
                  : "";
            return `
            <tr>
              <td class="desc">${escapeHtml(it.description || "")}</td>
              <td class="num">${formatIDR(Number(it.price) || 0)}</td>
              <td class="jml">${jmlCell}</td>
              <td class="num">${formatIDR(qtyNum * (Number(it.price) || 0))}</td>
            </tr>`;
          })
          .join("");

  // Fill remaining table rows so the grey block looks like the design.
  // Skip filler entirely if any item already has rincian — the bullet list
  // makes the row tall enough that extra padding rows just waste space.
  const hasAnyDetails = items.some(
    (it) =>
      String(it.details || "")
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0).length > 0
  );
  const minRows = hasAnyDetails ? 0 : 2;
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
      padding: 14mm 16mm;
      margin: 24px auto;
      background: white;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      position: relative;
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 1px solid #111;
    }
    .header h1 {
      font-family: 'Helvetica World', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 54px;
      letter-spacing: 1px;
      font-weight: 500;
      margin: 0;
      color: #111;
      line-height: 1;
    }
    .title-block { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .invoice-kind {
      font-size: 10px;
      letter-spacing: 2px;
      font-weight: 700;
      color: #777;
      padding: 4px 8px;
      border: 1px solid #ddd;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .status-pill {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1.5px;
      padding: 6px 12px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .status-pill.pending { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
    .status-pill.paid { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .brand { text-align: right; }
    .brand .logo-img { max-height: 72px; max-width: 260px; object-fit: contain; display: inline-block; }
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
      gap: 18px;
      margin-top: 14px;
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
    .meta-right .block + .block { margin-top: 8px; }
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
    }
    table.items thead th {
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
      font-weight: 700;
      padding: 8px 12px;
      text-align: left;
      color: #111;
    }
    table.items thead th.num { text-align: right; }
    table.items thead th.jml-head { text-align: center; }
    table.items tbody td {
      padding: 8px 12px;
      font-size: 13px;
      background: #ebebeb;
      vertical-align: top;
    }
    table.items tbody tr:last-child td { padding-bottom: 8px; }
    table.items tbody td.desc {
      font-weight: 600;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    table.items tbody td.num { text-align: right; }
    table.items tbody td.jml { text-align: center; font-size: 13px; }
    table.items tbody td.jml ul.rincian {
      display: inline-block;
      margin: 0;
      padding-left: 14px;
      text-align: left;
      list-style: disc;
      text-transform: none;
      font-weight: 400;
      letter-spacing: 0;
      line-height: 1.4;
    }
    table.items tbody td.jml ul.rincian li { padding: 1px 0; }
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
      gap: 24px;
      margin-top: 12px;
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
    .totals .row.sisa { padding-top: 8px; border-top: 1px solid #ccc; margin-top: 4px; }
    .totals .row.sisa .label, .totals .row.sisa .amount { color: #B43A38; font-size: 15px; }
    .totals .row.duedate .label, .totals .row.duedate .amount { font-size: 12px; }
    .totals .row.lunas .label, .totals .row.lunas .amount { color: #155724; font-size: 15px; }
    .totals .row.dp-paid .label, .totals .row.dp-paid .amount { color: #B43A38; font-weight: 700; }
    .event-note {
      margin-top: 12px;
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
      gap: 24px;
      margin-top: auto;
      padding-top: 36px;
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
      max-height: 72px;
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
      .page { box-shadow: none; margin: 0; min-height: 297mm; }
      .actions { display: none; }
      /* Hindari pecah di tengah baris/blok, tapi biarkan konten lanjut ke
         halaman 2 secara natural kalau memang tidak muat 1 halaman. */
      table.items tr, .bottom, .footer { page-break-inside: avoid; }
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
      <div class="title-block">
        <h1>INVOICE</h1>
        <div class="status-pill ${invoicePaid ? "paid" : "pending"}">${escapeHtml(headerStatus)}</div>
      </div>
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
          <th class="jml-head">JML</th>
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
        ${
          invoice.type === "pelunasan" && siblingDp
            ? `<div class="row dp-paid">
                 <span class="label">DP${pctSuffix} ${dpIsPaid ? "LUNAS" : "TERBAYAR"}</span>
                 <span class="amount">${formatIDR(dpPaid)}</span>
               </div>`
            : ""
        }
        <div class="row${invoicePaid ? " lunas" : ""}">
          <span class="label${invoicePaid ? "" : " dim"}">${escapeHtml(dueLabel)}</span>
          <span class="amount${invoicePaid ? "" : " dim"}">${formatIDR(dueAmount)}</span>
        </div>
        ${
          invoice.type === "dp" && !invoicePaid
            ? `<div class="row sisa">
                 <span class="label">SISA PEMBAYARAN</span>
                 <span class="amount">${formatIDR(sisaPembayaran)}</span>
               </div>`
            : ""
        }
        ${
          invoice.dueDate
            ? `<div class="row duedate">
                 <span class="label dim">${invoice.type === "dp" ? "DUE DATE PELUNASAN" : "DUE DATE"}</span>
                 <span class="amount dim">${escapeHtml(formatLongDate(new Date(invoice.dueDate)))}</span>
               </div>`
            : ""
        }
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
