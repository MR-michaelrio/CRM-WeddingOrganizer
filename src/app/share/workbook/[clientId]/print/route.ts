import { cookies } from "next/headers";
import { shareCookieName, verifyShareToken } from "@/lib/auth";
import { renderWorkbookPrintResponse } from "@/lib/workbook-print";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { clientId: string } }
) {
  const clientId = Number(params.clientId);
  if (Number.isNaN(clientId)) {
    return new Response("Invalid clientId", { status: 400 });
  }

  // Wajib sudah verifikasi PIN sebelumnya.
  const token = cookies().get(shareCookieName("workbook", clientId))?.value;
  const session = token ? await verifyShareToken(token) : null;
  if (!session || session.clientId !== clientId) {
    return new Response(
      "Akses ditolak. Buka link share dan masukkan PIN terlebih dahulu.",
      { status: 401 }
    );
  }

  return renderWorkbookPrintResponse(clientId);
}
