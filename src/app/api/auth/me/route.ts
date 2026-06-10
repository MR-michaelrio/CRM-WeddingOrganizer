import { cookies } from "next/headers";
import { ok, serverError } from "@/lib/api-helpers";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const token = cookies().get(SESSION_COOKIE_NAME)?.value;
    if (!token) return ok(null);
    const session = await verifySession(token);
    if (!session) return ok(null);
    const user = await prisma.user.findUnique({
      where: { id: session.uid },
      select: { id: true, name: true, username: true, email: true, role: true },
    });
    return ok(user);
  } catch (err) {
    return serverError(err);
  }
}
