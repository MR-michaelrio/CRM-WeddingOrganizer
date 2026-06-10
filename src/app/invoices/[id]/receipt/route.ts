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
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Konversi angka ke kata bahasa Indonesia (untuk format kwitansi).
function terbilang(n: number): string {
  n = Math.floor(Math.abs(n));
  const angka = [
    "",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
    "sepuluh",
    "sebelas",
  ];
  if (n < 12) return angka[n];
  if (n < 20) return terbilang(n - 10) + " belas";
  if (n < 100) {
    return terbilang(Math.floor(n / 10)) + " puluh" + (n % 10 ? " " + terbilang(n % 10) : "");
  }
  if (n < 200) return "seratus" + (n - 100 ? " " + terbilang(n - 100) : "");
  if (n < 1000) {
    return terbilang(Math.floor(n / 100)) + " ratus" + (n % 100 ? " " + terbilang(n % 100) : "");
  }
  if (n < 2000) return "seribu" + (n - 1000 ? " " + terbilang(n - 1000) : "");
  if (n < 1_000_000) {
    return terbilang(Math.floor(n / 1000)) + " ribu" + (n % 1000 ? " " + terbilang(n % 1000) : "");
  }
  if (n < 1_000_000_000) {
    return (
      terbilang(Math.floor(n / 1_000_000)) +
      " juta" +
      (n % 1_000_000 ? " " + terbilang(n % 1_000_000) : "")
    );
  }
  if (n < 1_000_000_000_000) {
    return (
      terbilang(Math.floor(n / 1_000_000_000)) +
      " milyar" +
      (n % 1_000_000_000 ? " " + terbilang(n % 1_000_000_000) : "")
    );
  }
  return String(n);
}

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
  const amountPaid = Number(invoice.amount);

  // Untuk Pelunasan, hitung total yang sudah dibayar termasuk DP sebelumnya.
  const siblingDp =
    invoice.type === "pelunasan"
      ? await prisma.invoice.findFirst({
          where: { clientId: invoice.clientId, type: "dp" },
          orderBy: [{ paidAt: "desc" }, { issuedDate: "desc" }],
          select: { number: true, amount: true, paidAt: true },
        })
      : null;
  const dpAmount = siblingDp ? Number(siblingDp.amount) : 0;
  const grandPaid = invoice.type === "pelunasan" ? dpAmount + amountPaid : amountPaid;

  const isLunasFull = invoice.type === "pelunasan";
  const statusLabel = isLunasFull ? "LUNAS" : "LUNAS DP";

  const paidDate = invoice.paidAt
    ? new Date(invoice.paidAt)
    : new Date(invoice.issuedDate);

  const brandName = setting?.brandName || "eclipse.sangjit";
  const brandLogoUrl = setting?.brandLogoUrl || "";
  const signatoryName = setting?.signatoryName || "";
  const signatureUrl = setting?.signatureUrl || "";
  const companyName = setting?.companyName || "WO Premium";

  const itemListHtml = items
    .map((it) => `<li>${escapeHtml(it.description)}</li>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Kwitansi ${isLunasFull ? "Pelunasan" : "Pembayaran DP"} ${escapeHtml(invoice.number)} — ${escapeHtml(invoice.client.names)}</title>
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
      padding: 18mm 18mm;
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
      padding-bottom: 14px;
      border-bottom: 2px solid #111;
    }
    .header h1 {
      font-family: 'Helvetica World', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 48px;
      letter-spacing: 1px;
      font-weight: 500;
      margin: 0;
      color: #111;
      line-height: 1;
    }
    .header h1 small { display: block; font-size: 14px; font-weight: 400; letter-spacing: 4px; color: #666; margin-top: 6px; }
    .brand { text-align: right; }
    .brand .logo-img { max-height: 72px; max-width: 260px; object-fit: contain; }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 20px;
    }
    .meta .label { font-weight: 700; font-size: 11px; letter-spacing: 0.5px; color: #666; margin-bottom: 4px; }
    .meta .value { font-size: 14px; }
    .meta-right { text-align: right; }
    .meta-right .block + .block { margin-top: 10px; }

    .status-band {
      margin-top: 24px;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: ${isLunasFull ? "#0E6B3A" : "#B47C00"};
      color: white;
      border-radius: 4px;
    }
    .status-band .status-label {
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 2px;
      opacity: 0.9;
    }
    .status-band .status-value {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 3px;
      line-height: 1;
    }
    .status-band .status-meta {
      text-align: right;
      font-size: 12px;
      line-height: 1.5;
    }

    .body {
      margin-top: 28px;
      font-size: 14px;
      line-height: 1.7;
    }
    .body p { margin: 0 0 12px 0; }
    .body .terbilang {
      font-style: italic;
      padding: 10px 14px;
      background: #f3f3f3;
      border-left: 3px solid #B43A38;
      margin: 12px 0;
    }
    .body .for-list {
      margin: 8px 0 12px 0;
      padding-left: 24px;
    }
    .body .for-list li { padding: 1px 0; }

    .ringkasan {
      margin-top: 18px;
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
    }
    .ringkasan .row {
      display: grid;
      grid-template-columns: 1fr auto;
      padding: 10px 16px;
      font-size: 13px;
    }
    .ringkasan .row + .row { border-top: 1px solid #eee; }
    .ringkasan .row.total {
      background: #fafafa;
      font-weight: 700;
    }
    .ringkasan .row.sisa {
      background: ${isLunasFull ? "#e9f7ec" : "#fff5e6"};
      color: ${isLunasFull ? "#0E6B3A" : "#B47C00"};
      font-weight: 700;
    }

    .footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: auto;
      padding-top: 36px;
    }
    .footer .place {
      font-size: 13px;
      align-self: end;
    }
    .footer .sign {
      text-align: center;
    }
    .footer .sign .label {
      font-size: 12px;
      color: #555;
      margin-bottom: 4px;
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
      font-weight: 600;
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
      .footer { page-break-inside: avoid; }
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
      <h1>KWITANSI<small>${isLunasFull ? "PELUNASAN" : "PEMBAYARAN DP"}</small></h1>
      <div class="brand">
        ${
          brandLogoUrl
            ? `<img class="logo-img" src="${escapeHtml(brandLogoUrl)}" alt="${escapeHtml(brandName)}" />`
            : `<div style="font-family:'Italiana','Cormorant Garamond',Georgia,serif; font-size:30px; color:#B43A38;">${escapeHtml(brandName)}</div>`
        }
      </div>
    </div>

    <div class="meta">
      <div>
        <div class="label">DITERIMA DARI</div>
        <div class="value"><strong>${escapeHtml(invoice.client.names)}</strong></div>
      </div>
      <div class="meta-right">
        <div class="block">
          <div class="label">NO. KWITANSI</div>
          <div class="value">${escapeHtml(invoice.number.replace("INV-", isLunasFull ? "KWP-" : "KWD-"))}</div>
        </div>
        <div class="block">
          <div class="label">TANGGAL</div>
          <div class="value">${escapeHtml(formatLongDate(paidDate))}</div>
        </div>
      </div>
    </div>

    <div class="status-band">
      <div>
        <div class="status-label">STATUS</div>
        <div class="status-value">${statusLabel}</div>
      </div>
      <div class="status-meta">
        ${isLunasFull ? "Seluruh pembayaran telah diterima." : "Pembayaran DP telah diterima."}<br/>
        Invoice ref: ${escapeHtml(invoice.number)}
      </div>
    </div>

    <div class="body">
      <p>
        Telah diterima pembayaran dari <strong>${escapeHtml(invoice.client.names)}</strong>
        sebesar:
      </p>
      <div class="terbilang">
        ${formatIDR(amountPaid)} — <em>(${terbilang(amountPaid)} rupiah)</em>
      </div>
      <p>
        Untuk pembayaran ${isLunasFull ? "<strong>PELUNASAN</strong>" : "<strong>DOWN PAYMENT (DP)</strong>"}
        atas jasa berikut:
      </p>
      ${itemListHtml ? `<ul class="for-list">${itemListHtml}</ul>` : ""}

      <div class="ringkasan">
        <div class="row">
          <span>Total nilai paket</span>
          <span>${formatIDR(total)}</span>
        </div>
        ${
          invoice.type === "pelunasan" && siblingDp
            ? `<div class="row">
                 <span>DP yang sudah dibayar (${escapeHtml(siblingDp.number)})</span>
                 <span>${formatIDR(dpAmount)}</span>
               </div>`
            : ""
        }
        <div class="row total">
          <span>Dibayar pada kwitansi ini</span>
          <span>${formatIDR(amountPaid)}</span>
        </div>
        <div class="row sisa">
          <span>${isLunasFull ? "Status pembayaran" : "Sisa yang harus dibayar"}</span>
          <span>${isLunasFull ? "LUNAS" : formatIDR(Math.max(0, total - grandPaid))}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="place">
        Jakarta, ${escapeHtml(formatLongDate(paidDate))}<br/>
        <strong>${escapeHtml(companyName)}</strong>
      </div>
      <div class="sign">
        <div class="label">Diterima oleh,</div>
        ${signatureUrl ? `<img src="${escapeHtml(signatureUrl)}" alt="signature" />` : "<div style='height:60px'>&nbsp;</div>"}
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
