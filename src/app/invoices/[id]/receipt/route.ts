import { buildReceiptHtml } from "@/lib/receipt-print";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) return new Response("Invalid id", { status: 400 });

  const built = await buildReceiptHtml(id);
  if (!built) return new Response("Invoice not found", { status: 404 });

  return new Response(built.html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
