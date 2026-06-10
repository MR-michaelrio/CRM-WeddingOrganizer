import { renderWorkbookPrintResponse } from "@/lib/workbook-print";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return renderWorkbookPrintResponse(Number(params.id));
}
