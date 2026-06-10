import { prisma } from "@/lib/prisma";

// Generate sequential invoice number untuk tahun berjalan, format: INV-YYYY-NNNN.
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const latest = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const lastSeq = latest ? Number(latest.number.slice(prefix.length)) || 0 : 0;
  const next = String(lastSeq + 1).padStart(4, "0");
  return `${prefix}${next}`;
}
