import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

// Render multi-paragraph text dari Settings. Mendukung:
//  - paragraf biasa (dipisahkan baris kosong)
//  - bullet list: baris yang diawali "- " atau "* "
function renderRichText(text: string): string {
  const lines = text.split(/\r?\n/);
  let html = "";
  let inList = false;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html += `<p>${escapeHtml(paragraph.join(" "))}</p>`;
    paragraph = [];
  };
  const closeList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flushParagraph();
      closeList();
      continue;
    }
    const isBullet = line.startsWith("- ") || line.startsWith("* ");
    if (isBullet) {
      flushParagraph();
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${escapeHtml(line.slice(2).trim())}</li>`;
    } else {
      closeList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  closeList();
  return html;
}

const DEFAULT_TERMS =
  "PIHAK PERTAMA (Vendor) berkewajiban menyediakan jasa sesuai paket yang disepakati pada tanggal acara yang tertera.\n" +
  "PIHAK KEDUA (Client) berkewajiban melakukan pembayaran sesuai timeline pembayaran yang telah ditentukan.\n" +
  "Kedua belah pihak setuju untuk menjaga komunikasi yang baik selama persiapan hingga hari pelaksanaan acara.";

const DEFAULT_PAYMENT_TERMS =
  "- DP minimal 30% dibayarkan pada saat kontrak ditandatangani.\n" +
  "- Pelunasan paling lambat H-7 sebelum tanggal acara.\n" +
  "- Pembayaran dilakukan via transfer ke rekening yang tertera pada invoice.";

const DEFAULT_CANCELLATION =
  "- Pembatalan dari PIHAK KEDUA: DP tidak dapat dikembalikan.\n" +
  "- Perubahan jadwal acara: hanya dapat dilakukan 1 (satu) kali, dengan konfirmasi minimal H-30 sebelum tanggal awal acara.\n" +
  "- Hal-hal di luar kuasa kedua pihak (force majeure) akan diselesaikan secara musyawarah.";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) return new Response("Invalid id", { status: 400 });

  const [client, setting, packageInfo, invoices] = await Promise.all([
    prisma.client.findUnique({ where: { id } }),
    prisma.setting.findUnique({ where: { id: 1 } }),
    prisma.client
      .findUnique({ where: { id }, select: { package: true } })
      .then((c) =>
        c?.package
          ? prisma.package.findUnique({ where: { name: c.package } })
          : null
      ),
    prisma.invoice.findMany({
      where: { clientId: id },
      orderBy: [{ type: "asc" }, { issuedDate: "asc" }],
      select: { number: true, type: true, amount: true, dueDate: true, status: true },
    }),
  ]);

  if (!client) return new Response("Client not found", { status: 404 });

  const companyName = setting?.companyName || "WO Premium";
  const companyAddress = setting?.companyAddress || "";
  const companyPhone = setting?.companyPhone || "";
  const companyEmail = setting?.companyEmail || "";
  const signatoryName = setting?.signatoryName || "";
  const signatureUrl = setting?.signatureUrl || "";
  const brandLogoUrl = setting?.brandLogoUrl || "";
  const brandName = setting?.brandName || "eclipse.sangjit";

  const terms = setting?.contractTerms?.trim() || DEFAULT_TERMS;
  const paymentTerms =
    setting?.contractPaymentTerms?.trim() || DEFAULT_PAYMENT_TERMS;
  const cancellation = setting?.contractCancellation?.trim() || DEFAULT_CANCELLATION;

  const contractValue = client.contractValue
    ? Number(client.contractValue)
    : packageInfo
      ? Number(packageInfo.price)
      : 0;
  const today = new Date();

  const paymentRowsHtml =
    invoices.length === 0
      ? `<tr><td colspan="4" style="text-align:center; color:#888; font-style:italic;">Belum ada invoice tercatat.</td></tr>`
      : invoices
          .map(
            (inv) => `
            <tr>
              <td>${escapeHtml(inv.type === "dp" ? "Down Payment (DP)" : "Pelunasan")}</td>
              <td>${escapeHtml(inv.number)}</td>
              <td style="text-align:right;">${formatIDR(Number(inv.amount))}</td>
              <td>${inv.dueDate ? escapeHtml(formatLongDate(new Date(inv.dueDate))) : "—"}</td>
            </tr>`
          )
          .join("");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Kontrak Kerja Sama — ${escapeHtml(client.names)}</title>
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
      padding: 18mm 20mm;
      margin: 24px auto;
      background: white;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      position: relative;
    }
    .header {
      text-align: center;
      padding-bottom: 16px;
      border-bottom: 2px solid #111;
    }
    .header .logo-img { max-height: 64px; margin-bottom: 8px; }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 4px;
      margin: 8px 0 4px 0;
    }
    .header .company { font-size: 13px; color: #444; }
    .header .meta { font-size: 11px; color: #777; margin-top: 4px; }

    .preamble {
      margin-top: 24px;
      font-size: 13px;
      line-height: 1.7;
    }
    .parties {
      margin-top: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      font-size: 13px;
    }
    .parties .party {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 14px 16px;
      line-height: 1.6;
    }
    .parties .party .label {
      font-weight: 700;
      letter-spacing: 1px;
      font-size: 11px;
      color: #B43A38;
      margin-bottom: 8px;
    }
    .parties .party .row { margin-bottom: 2px; }
    .parties .party .row strong { display: inline-block; min-width: 92px; color: #555; font-weight: 500; }

    h2.section {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 2px;
      margin: 24px 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 1px solid #ddd;
      text-transform: uppercase;
    }

    .package-box {
      background: #fafafa;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 14px 18px;
      font-size: 13px;
      line-height: 1.7;
    }
    .package-box .row { display: grid; grid-template-columns: 160px 1fr; }
    .package-box .row strong { color: #555; font-weight: 500; }
    .package-box .desc-block { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ddd; white-space: pre-wrap; }

    table.payments {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    table.payments th, table.payments td {
      border-bottom: 1px solid #eee;
      padding: 8px 10px;
      text-align: left;
    }
    table.payments thead th {
      background: #f3f3f3;
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #444;
    }

    .rich-text {
      font-size: 12.5px;
      line-height: 1.7;
    }
    .rich-text p { margin: 0 0 8px 0; }
    .rich-text ul { margin: 4px 0 8px 18px; padding: 0; }
    .rich-text li { margin: 2px 0; }

    .signatures {
      margin-top: 36px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
      page-break-inside: avoid;
    }
    .signatures .sign {
      text-align: center;
      font-size: 13px;
    }
    .signatures .sign .label { font-weight: 700; margin-bottom: 6px; letter-spacing: 1px; }
    .signatures .sign .role { font-size: 11px; color: #666; margin-bottom: 8px; }
    .signatures .sign .pad {
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .signatures .sign .pad img { max-height: 72px; max-width: 200px; object-fit: contain; }
    .signatures .sign .line {
      border-top: 1px solid #111;
      padding-top: 6px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .signatures .sign .name-detail { font-size: 11px; color: #666; margin-top: 2px; }

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
      h2.section, .package-box, .parties, .signatures { page-break-inside: avoid; }
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
      ${brandLogoUrl ? `<img class="logo-img" src="${escapeHtml(brandLogoUrl)}" alt="${escapeHtml(brandName)}" />` : ""}
      <h1>KONTRAK KERJA SAMA</h1>
      <div class="company">${escapeHtml(companyName)}</div>
      <div class="meta">Dibuat pada ${escapeHtml(formatLongDate(today))}</div>
    </div>

    <div class="preamble">
      Pada hari ini, <strong>${escapeHtml(formatLongDate(today))}</strong>, telah disepakati
      perjanjian kerja sama antara kedua pihak di bawah ini:
    </div>

    <div class="parties">
      <div class="party">
        <div class="label">PIHAK PERTAMA (VENDOR)</div>
        <div class="row"><strong>Nama</strong>${escapeHtml(companyName)}</div>
        ${signatoryName ? `<div class="row"><strong>Perwakilan</strong>${escapeHtml(signatoryName)}</div>` : ""}
        ${companyAddress ? `<div class="row"><strong>Alamat</strong>${escapeHtml(companyAddress)}</div>` : ""}
        ${companyPhone ? `<div class="row"><strong>Telepon</strong>${escapeHtml(companyPhone)}</div>` : ""}
        ${companyEmail ? `<div class="row"><strong>Email</strong>${escapeHtml(companyEmail)}</div>` : ""}
      </div>
      <div class="party">
        <div class="label">PIHAK KEDUA (CLIENT)</div>
        <div class="row"><strong>Nama</strong>${escapeHtml(client.names)}</div>
        ${client.phone ? `<div class="row"><strong>Telepon</strong>${escapeHtml(client.phone)}</div>` : ""}
        ${client.email ? `<div class="row"><strong>Email</strong>${escapeHtml(client.email)}</div>` : ""}
        ${client.venue ? `<div class="row"><strong>Venue</strong>${escapeHtml(client.venue)}</div>` : ""}
      </div>
    </div>

    <h2 class="section">Pasal 1 — Detail Paket & Acara</h2>
    <div class="package-box">
      <div class="row"><strong>Jenis Acara</strong>${escapeHtml(client.eventType)}</div>
      <div class="row"><strong>Tanggal Acara</strong>${escapeHtml(formatLongDate(new Date(client.eventDate)))}</div>
      ${client.venue ? `<div class="row"><strong>Venue</strong>${escapeHtml(client.venue)}</div>` : ""}
      ${client.package ? `<div class="row"><strong>Paket</strong>${escapeHtml(client.package)}</div>` : ""}
      <div class="row"><strong>Nilai Kontrak</strong>${formatIDR(contractValue)}</div>
      ${
        packageInfo?.description
          ? `<div class="desc-block"><strong style="display:block; margin-bottom:4px; color:#555;">Rincian paket:</strong>${escapeHtml(packageInfo.description)}</div>`
          : ""
      }
    </div>

    <h2 class="section">Pasal 2 — Hak & Kewajiban</h2>
    <div class="rich-text">${renderRichText(terms)}</div>

    <h2 class="section">Pasal 3 — Timeline Pembayaran</h2>
    <div class="rich-text">${renderRichText(paymentTerms)}</div>
    ${
      invoices.length > 0
        ? `<table class="payments" style="margin-top: 8px;">
            <thead>
              <tr>
                <th>Tahap</th>
                <th>No. Invoice</th>
                <th style="text-align:right;">Jumlah</th>
                <th>Jatuh Tempo</th>
              </tr>
            </thead>
            <tbody>${paymentRowsHtml}</tbody>
          </table>`
        : ""
    }

    <h2 class="section">Pasal 4 — Pembatalan & Perubahan Jadwal</h2>
    <div class="rich-text">${renderRichText(cancellation)}</div>

    <h2 class="section">Pasal 5 — Penutup</h2>
    <div class="rich-text">
      <p>
        Kontrak ini dibuat dalam keadaan sadar tanpa paksaan dari pihak manapun dan ditandatangani
        oleh kedua belah pihak sebagai bukti kesepakatan.
      </p>
    </div>

    <div class="signatures">
      <div class="sign">
        <div class="label">PIHAK PERTAMA</div>
        <div class="role">Vendor</div>
        <div class="pad">
          ${signatureUrl ? `<img src="${escapeHtml(signatureUrl)}" alt="signature" />` : ""}
        </div>
        <div class="line">${escapeHtml(signatoryName || "(tanda tangan & nama)")}</div>
        <div class="name-detail">${escapeHtml(companyName)}</div>
      </div>
      <div class="sign">
        <div class="label">PIHAK KEDUA</div>
        <div class="role">Client</div>
        <div class="pad"></div>
        <div class="line">${escapeHtml(client.names)}</div>
        <div class="name-detail">(tanda tangan & nama lengkap)</div>
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
