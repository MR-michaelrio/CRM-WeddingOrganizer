import { cookies } from "next/headers";
import { ok, serverError } from "@/lib/api-helpers";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    cookies().delete(SESSION_COOKIE_NAME);
    return ok({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
