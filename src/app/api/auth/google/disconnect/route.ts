import { disconnectGoogle } from "@/lib/google";
import { ok, serverError } from "@/lib/api-helpers";

export async function POST() {
  try {
    await disconnectGoogle();
    return ok({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
