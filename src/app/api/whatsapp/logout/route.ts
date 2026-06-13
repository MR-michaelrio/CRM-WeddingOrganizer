import { logoutWhatsApp } from "@/lib/whatsapp";
import { ok, serverError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await logoutWhatsApp();
    return ok({ loggedOut: true });
  } catch (err) {
    return serverError(err);
  }
}
