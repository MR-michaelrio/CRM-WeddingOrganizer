// Template pesan WhatsApp. Pure (tanpa dependency Node) — aman dipakai di client
// component untuk preview maupun di server.
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

function bankBlock(bank: WaTemplateCtx["bank"]): string {
  return `${bank.name}\n${bank.account}\na.n. ${bank.accountName}`;
}

function typeLabel(type: string): string {
  return type === "dp" ? "DP (Down Payment)" : type === "pelunasan" ? "Pelunasan" : type;
}

export function invoiceMessage(ctx: WaTemplateCtx, inv: WaInvoice): string {
  return [
    `Halo ${ctx.clientNames} 🙏`,
    ``,
    `Berikut invoice *${typeLabel(inv.type)}* untuk acara ${ctx.eventType} (${formatDateID(ctx.eventDate)}):`,
    ``,
    `No. Invoice : ${inv.number}`,
    `Jumlah : *${formatIDR(inv.amount)}*`,
    inv.dueDate ? `Jatuh tempo : ${formatDateID(inv.dueDate)}` : null,
    ``,
    `Pembayaran dapat ditransfer ke:`,
    bankBlock(ctx.bank),
    ``,
    `Mohon konfirmasi setelah melakukan transfer ya. Terima kasih 🤍`,
    ctx.brandName,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function paymentReminderMessage(
  ctx: WaTemplateCtx,
  outstanding: number,
  dueDate: string | Date | null
): string {
  return [
    `Halo ${ctx.clientNames} 🙏`,
    ``,
    `Izin mengingatkan untuk pelunasan acara ${ctx.eventType} (${formatDateID(ctx.eventDate)}).`,
    ``,
    `Sisa pembayaran : *${formatIDR(outstanding)}*`,
    dueDate ? `Jatuh tempo : ${formatDateID(dueDate)}` : null,
    ``,
    `Pembayaran dapat ditransfer ke:`,
    bankBlock(ctx.bank),
    ``,
    `Mohon konfirmasi setelah transfer. Terima kasih banyak 🤍`,
    ctx.brandName,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function receiptMessage(ctx: WaTemplateCtx, kind: "dp" | "pelunasan"): string {
  const label = kind === "dp" ? "pembayaran DP" : "pelunasan";
  return [
    `Halo ${ctx.clientNames} 🙏`,
    ``,
    `Terlampir kwitansi ${label} untuk acara ${ctx.eventType} (${formatDateID(ctx.eventDate)}).`,
    kind === "pelunasan"
      ? `Pembayaran sudah *LUNAS*. Terima kasih banyak atas kepercayaannya 🤍`
      : `Terima kasih atas pembayaran DP-nya 🤍`,
    ctx.brandName,
  ].join("\n");
}

export function workbookMessage(
  ctx: WaTemplateCtx,
  link: string,
  pin: string | null
): string {
  return [
    `Halo ${ctx.clientNames} 🙏`,
    ``,
    `Berikut link workbook acara ${ctx.eventType} (rundown & detail acara):`,
    link,
    pin ? `\nPIN akses: *${pin}*` : null,
    ``,
    `Silakan dibuka & dicek ya. Terima kasih 🤍`,
    ctx.brandName,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function meetingMessage(ctx: WaTemplateCtx, link: string): string {
  return [
    `Halo ${ctx.clientNames} 🙏`,
    ``,
    `Berikut link meeting untuk acara ${ctx.eventType}:`,
    link,
    ``,
    `Mohon bergabung pada waktu yang sudah disepakati ya. Sampai jumpa 🤍`,
    ctx.brandName,
  ].join("\n");
}
