import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { badRequest, ok, parseJson, serverError } from "@/lib/api-helpers";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  createSession,
} from "@/lib/auth";
import { hashPassword } from "@/lib/auth-node";

type SetupBody = {
  name: string;
  username: string;
  password: string;
};

// GET: cek apakah app perlu di-setup (belum ada user dengan password).
export async function GET() {
  try {
    const count = await prisma.user.count({
      where: { passwordHash: { not: null } },
    });
    return ok({ needsSetup: count === 0 });
  } catch (err) {
    return serverError(err);
  }
}

// POST: buat admin pertama. Hanya boleh saat belum ada user dengan password.
export async function POST(req: Request) {
  try {
    const existing = await prisma.user.count({
      where: { passwordHash: { not: null } },
    });
    if (existing > 0) {
      return badRequest("Setup sudah dilakukan. Silakan login.");
    }

    const body = await parseJson<SetupBody>(req);
    const name = (body.name || "").trim();
    const username = (body.username || "").trim();
    const password = body.password || "";

    if (!name) return badRequest("Nama wajib diisi");
    if (!username || username.length < 3) {
      return badRequest("Username minimal 3 karakter");
    }
    if (!password || password.length < 6) {
      return badRequest("Password minimal 6 karakter");
    }

    const passwordHash = await hashPassword(password);
    // Re-use user with same username/email if ada (cuma update password).
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
    });

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: { username, passwordHash, name },
        })
      : await prisma.user.create({
          data: {
            name,
            username,
            email: username.includes("@") ? username : `${username}@local`,
            passwordHash,
            role: "super_admin",
          },
        });

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
      role: user.role,
    });
  } catch (err) {
    return serverError(err);
  }
}
