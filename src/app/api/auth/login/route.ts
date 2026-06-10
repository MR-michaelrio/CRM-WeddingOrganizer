import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { badRequest, ok, parseJson, serverError } from "@/lib/api-helpers";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  createSession,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/auth-node";

type LoginBody = { username: string; password: string };

export async function POST(req: Request) {
  try {
    const body = await parseJson<LoginBody>(req);
    const username = (body.username || "").trim();
    const password = body.password || "";
    if (!username || !password) {
      return badRequest("Username dan password wajib diisi");
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email: username }],
      },
    });
    if (!user || !user.passwordHash) {
      return badRequest("Username atau password salah");
    }
    const okPw = await verifyPassword(password, user.passwordHash);
    if (!okPw) return badRequest("Username atau password salah");

    const token = await createSession({
      uid: user.id,
      username: user.username || user.email,
      role: user.role,
    });

    cookies().set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return ok({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    return serverError(err);
  }
}
