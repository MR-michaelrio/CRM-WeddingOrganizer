import { getWhatsAppStatus } from "@/lib/whatsapp";
import { ok, serverError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getWhatsAppStatus();
    return ok(status);
  } catch (err) {
    return serverError(err);
  }
}
