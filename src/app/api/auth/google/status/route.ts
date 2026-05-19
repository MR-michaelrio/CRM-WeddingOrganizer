import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const account = await prisma.googleAccount.findUnique({
      where: { id: 1 },
      select: { email: true, createdAt: true, updatedAt: true, scope: true },
    });
    return ok({
      connected: Boolean(account),
      email: account?.email ?? null,
      connectedAt: account?.createdAt ?? null,
      scope: account?.scope ?? null,
    });
  } catch (err) {
    return serverError(err);
  }
}
