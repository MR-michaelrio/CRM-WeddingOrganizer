// Template pesan WhatsApp. Pure (tanpa dependency Node) — aman dipakai di client
// component untuk preview maupun di server.
//
// Template kini editable lewat Settings → disimpan di tabel Setting (kolom
// waTemplate*). Teks template memakai token {namaVariabel} yang di-substitusi
// saat pengiriman. Fungsi pesan menerima `tpl` opsional; jika tidak diberikan,
// memakai DEFAULT_WA_TEMPLATES.
import { formatIDR, formatDateID } from "@/lib/format";

export type WaTemplateCtx = {
  clientNames: string;
  eventType: string;
  eventDate: string | Date;
  brandName: string;
  bank: { name: string; account: string; accountName: string };
};

export type WaInvoice = {
  number: string;
  amount: number | string;
  type: "dp" | "pelunasan" | string;
  dueDate: string | Date | null;
};

export const WA_TEMPLATE_KEYS = [
  "invoice",
  "reminder",
  "receiptDp",
  "receiptPelunasan",
  "workbook",
  "meeting",
] as const;

export type WaTemplateKey = (typeof WA_TEMPLATE_KEYS)[number];
export type WaTemplates = Record<WaTemplateKey, string>;

// ---- Default template (token {var}) ----
export const DEFAULT_WA_TEMPLATES: WaTemplates = {
  invoice: `Halo {clientNames} 🙏

Berikut invoice *{invoiceType}* untuk acara {eventType} ({eventDate}):

No. Invoice : {invoiceNumber}
Jumlah : *{amount}*
Jatuh tempo : {dueDate}

Pembayaran dapat ditransfer ke:
{bankName}
{bankAccount}
a.n. {bankAccountName}

Mohon konfirmasi setelah melakukan transfer ya. Terima kasih 🤍
{brandName}`,

  reminder: `Halo {clientNames} 🙏

Izin mengingatkan untuk pelunasan acara {eventType} ({eventDate}).

Sisa pembayaran : *{outstanding}*
Jatuh tempo : {dueDate}

Pembayaran dapat ditransfer ke:
{bankName}
{bankAccount}
a.n. {bankAccountName}

Mohon konfirmasi setelah transfer. Terima kasih banyak 🤍
{brandName}`,

  receiptDp: `Halo {clientNames} 🙏

Terlampir kwitansi pembayaran DP untuk acara {eventType} ({eventDate}).
Terima kasih atas pembayaran DP-nya 🤍
{brandName}`,

  receiptPelunasan: `Halo {clientNames} 🙏

Terlampir kwitansi pelunasan untuk acara {eventType} ({eventDate}).
Pembayaran sudah *LUNAS*. Terima kasih banyak atas kepercayaannya 🤍
{brandName}`,

  workbook: `Halo {clientNames} 🙏

Berikut link workbook acara {eventType} (rundown & detail acara):
{link}

PIN akses: *{pin}*

Silakan dibuka & dicek ya. Terima kasih 🤍
{brandName}`,

  meeting: `Halo {clientNames} 🙏

Berikut link meeting untuk acara {eventType}:
{link}

Mohon bergabung pada waktu yang sudah disepakati ya. Sampai jumpa 🤍
{brandName}`,
};

// Metadata untuk UI editor template (label + token yang tersedia).
export const WA_TEMPLATE_META: {
  key: WaTemplateKey;
  label: string;
  description: string;
  tokens: string[];
}[] = [
  {
    key: "invoice",
    label: "Invoice (PDF)",
    description: "Caption saat mengirim invoice.",
    tokens: [
      "clientNames",
      "eventType",
      "eventDate",
      "invoiceType",
      "invoiceNumber",
      "amount",
      "dueDate",
      "bankName",
      "bankAccount",
      "bankAccountName",
      "brandName",
    ],
  },
  {
    key: "reminder",
    label: "Pengingat Pelunasan",
    description: "Pesan pengingat sisa pembayaran.",
    tokens: [
      "clientNames",
      "eventType",
      "eventDate",
      "outstanding",
      "dueDate",
      "bankName",
      "bankAccount",
      "bankAccountName",
      "brandName",
    ],
  },
  {
    key: "receiptDp",
    label: "Kwitansi DP",
    description: "Caption kwitansi pembayaran DP.",
    tokens: ["clientNames", "eventType", "eventDate", "brandName"],
  },
  {
    key: "receiptPelunasan",
    label: "Kwitansi Pelunasan",
    description: "Caption kwitansi pelunasan.",
    tokens: ["clientNames", "eventType", "eventDate", "brandName"],
  },
  {
    key: "workbook",
    label: "Link Workbook",
    description: "Pesan saat mengirim link workbook + PIN.",
    tokens: ["clientNames", "eventType", "link", "pin", "brandName"],
  },
  {
    key: "meeting",
    label: "Link Meeting",
    description: "Pesan saat mengirim link Google Meet.",
    tokens: ["clientNames", "eventType", "link", "brandName"],
  },
];

/** Substitusi token {key} dengan nilai dari vars. Token tak dikenal dibiarkan. */
export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in vars ? vars[k] : `{${k}}`
  );
}

function typeLabel(type: string): string {
  return type === "dp" ? "DP (Down Payment)" : type === "pelunasan" ? "Pelunasan" : type;
}

function baseVars(ctx: WaTemplateCtx): Record<string, string> {
  return {
    clientNames: ctx.clientNames,
    eventType: ctx.eventType,
    eventDate: formatDateID(ctx.eventDate),
    brandName: ctx.brandName,
    bankName: ctx.bank.name,
    bankAccount: ctx.bank.account,
    bankAccountName: ctx.bank.accountName,
  };
}

export function invoiceMessage(
  ctx: WaTemplateCtx,
  inv: WaInvoice,
  tpl: string = DEFAULT_WA_TEMPLATES.invoice
): string {
  return renderTemplate(tpl, {
    ...baseVars(ctx),
    invoiceType: typeLabel(inv.type),
    invoiceNumber: inv.number,
    amount: formatIDR(inv.amount),
    dueDate: inv.dueDate ? formatDateID(inv.dueDate) : "-",
  });
}

export function paymentReminderMessage(
  ctx: WaTemplateCtx,
  outstanding: number,
  dueDate: string | Date | null,
  tpl: string = DEFAULT_WA_TEMPLATES.reminder
): string {
  return renderTemplate(tpl, {
    ...baseVars(ctx),
    outstanding: formatIDR(outstanding),
    dueDate: dueDate ? formatDateID(dueDate) : "-",
  });
}

export function receiptMessage(
  ctx: WaTemplateCtx,
  kind: "dp" | "pelunasan",
  tpl?: string
): string {
  const template =
    tpl ??
    (kind === "dp"
      ? DEFAULT_WA_TEMPLATES.receiptDp
      : DEFAULT_WA_TEMPLATES.receiptPelunasan);
  return renderTemplate(template, baseVars(ctx));
}

export function workbookMessage(
  ctx: WaTemplateCtx,
  link: string,
  pin: string | null,
  tpl: string = DEFAULT_WA_TEMPLATES.workbook
): string {
  return renderTemplate(tpl, {
    ...baseVars(ctx),
    link,
    pin: pin ?? "",
  });
}

export function meetingMessage(
  ctx: WaTemplateCtx,
  link: string,
  tpl: string = DEFAULT_WA_TEMPLATES.meeting
): string {
  return renderTemplate(tpl, {
    ...baseVars(ctx),
    link,
  });
}

/** Ambil templates dari objek Setting (fallback ke default per-key). */
export function resolveTemplates(
  setting:
    | Partial<Record<`waTemplate${Capitalize<WaTemplateKey>}`, string | null>>
    | null
    | undefined
): WaTemplates {
  const get = (key: WaTemplateKey): string => {
    const field = `waTemplate${key.charAt(0).toUpperCase()}${key.slice(1)}` as
      `waTemplate${Capitalize<WaTemplateKey>}`;
    const val = setting?.[field];
    return val && val.trim() ? val : DEFAULT_WA_TEMPLATES[key];
  };
  return {
    invoice: get("invoice"),
    reminder: get("reminder"),
    receiptDp: get("receiptDp"),
    receiptPelunasan: get("receiptPelunasan"),
    workbook: get("workbook"),
    meeting: get("meeting"),
  };
}
