import { prisma } from "@/lib/prisma";
import { resolveSangjitTimes } from "@/lib/templates/sangjit-rundown";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateID(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function renderWorkbookPrintResponse(
  clientId: number
): Promise<Response> {
  if (Number.isNaN(clientId)) {
    return new Response("Invalid id", { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      pic: { select: { name: true } },
      workbook: {
        include: { sheets: { orderBy: { position: "asc" } } },
      },
    },
  });

  if (!client) {
    return new Response("Client not found", { status: 404 });
  }

  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { companyName: true },
  });
  const companyName = setting?.companyName?.trim() || "WO Premium";

  const sheets = (client.workbook?.sheets ?? []).map((s) => {
    const columns = (s.columns as string[]) ?? [];
    const rawRows = (s.rows as Record<string, string>[]) ?? [];
    return {
      name: s.name,
      columns,
      rows: resolveSangjitTimes(columns, rawRows),
    };
  });

  const sheetHtml = sheets
    .map((sheet) => {
      const header = `<tr><th style="width:40px">#</th>${sheet.columns
        .map((c) => `<th>${escapeHtml(c)}</th>`)
        .join("")}</tr>`;
      const body =
        sheet.rows.length === 0
          ? `<tr><td colspan="${sheet.columns.length + 1}" class="empty">Belum ada data</td></tr>`
          : sheet.rows
              .map(
                (row, idx) =>
                  `<tr><td class="rownum">${idx + 1}</td>${sheet.columns
                    .map((c) => `<td>${escapeHtml(row[c] ?? "")}</td>`)
                    .join("")}</tr>`
              )
              .join("");
      return `
        <div class="sheet">
          <h2>${escapeHtml(sheet.name)}</h2>
          <table><thead>${header}</thead><tbody>${body}</tbody></table>
        </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Print: ${escapeHtml(client.names)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { margin: 1.5cm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #2E2A27;
      margin: 0;
      padding: 24px;
      background: white;
      line-height: 1.5;
    }
    h1 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 32px;
      margin: 0 0 4px;
      font-weight: 600;
    }
    .subtitle { color: #6B6662; font-size: 14px; margin-bottom: 24px; }
    .meta {
      display: flex; flex-wrap: wrap; gap: 16px;
      margin-bottom: 32px; padding-bottom: 16px;
      border-bottom: 2px solid #D4B483;
    }
    .meta-item { font-size: 13px; color: #6B6662; }
    .meta-item strong { color: #2E2A27; font-weight: 600; }
    .sheet { margin-bottom: 32px; page-break-inside: avoid; }
    .sheet h2 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 22px;
      margin: 0 0 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #E5DED5;
      color: #B89A6A;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #E5DED5;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #F8F5F0;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #6B6662;
    }
    .rownum { text-align: center; color: #9D9691; width: 40px; }
    tr:nth-child(even) td { background: #FAFAF7; }
    .empty {
      text-align: center; color: #9D9691;
      font-style: italic; font-size: 12px;
      padding: 16px !important;
    }
    .footer {
      margin-top: 40px; padding-top: 12px;
      border-top: 1px solid #E5DED5;
      font-size: 11px; color: #9D9691;
      text-align: right;
    }
    .actions {
      position: fixed; top: 16px; right: 16px;
      display: flex; gap: 8px;
      background: white; padding: 8px;
      border: 1px solid #E5DED5; border-radius: 8px;
      box-shadow: 0 4px 6px rgba(46,42,39,.08);
    }
    .actions button {
      background: linear-gradient(135deg, #D4B483, #B89A6A);
      color: white; border: 0; cursor: pointer;
      padding: 8px 14px; border-radius: 6px;
      font-size: 13px; font-weight: 600;
    }
    .actions button.secondary {
      background: white; color: #2E2A27;
      border: 1px solid #E5DED5;
    }
    @media print {
      body { padding: 0; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Print</button>
    <button class="secondary" onclick="window.close()">Close</button>
  </div>
  <h1>${escapeHtml(client.names)}</h1>
  <div class="subtitle">${escapeHtml(client.eventType)} Workbook</div>

  <div class="meta">
    <div class="meta-item"><strong>Tanggal:</strong> ${formatDateID(client.eventDate)}</div>
    ${client.venue ? `<div class="meta-item"><strong>Venue:</strong> ${escapeHtml(client.venue)}</div>` : ""}
    ${client.pic?.name ? `<div class="meta-item"><strong>PIC:</strong> ${escapeHtml(client.pic.name)}</div>` : ""}
    ${client.package ? `<div class="meta-item"><strong>Package:</strong> ${escapeHtml(client.package)}</div>` : ""}
  </div>

  ${sheetHtml}

  <div class="footer">Generated by ${escapeHtml(companyName)} · ${formatDateID(new Date())}</div>

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
