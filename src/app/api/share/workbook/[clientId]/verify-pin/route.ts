import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, ok, parseJson, serverError } from "@/lib/api-helpers";
import {
  SHARE_TOKEN_TTL_SEC,
  createShareToken,
  shareCookieName,
} from "@/lib/auth";

type Body = { pin: string };

export async function POST(
  req: Request,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = Number(params.clientId);
    if (Number.isNaN(clientId)) return badRequest("Invalid clientId");

    const body = await parseJson<Body>(req);
    const pin = (body.pin || "").trim();
    if (!/^\d{6}$/.test(pin)) return badRequest("PIN harus 6 digit angka");

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, workbookPin: true, names: true },
    });
    if (!client) return notFound();
    if (!client.workbookPin) {
      return badRequest(
        "Link share belum aktif. Minta tuan rumah untuk mengaktifkan PIN."
      );
    }
    if (client.workbookPin !== pin) {
      return badRequest("PIN salah");
    }

    const token = await createShareToken({ kind: "workbook", clientId });
    cookies().set(shareCookieName("workbook", clientId), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: `/share/workbook/${clientId}`,
      maxAge: SHARE_TOKEN_TTL_SEC,
    });

    return ok({ ok: true, name: client.names });
  } catch (err) {
    return serverError(err);
  }
}
