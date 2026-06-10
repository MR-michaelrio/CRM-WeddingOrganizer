import { SignJWT, jwtVerify } from "jose";

// Secret untuk sign session JWT. Wajib di .env. Kalau kosong, app tidak
// akan jalan — sengaja, supaya admin set secret dulu.
//
// IMPORTANT: File ini di-import oleh middleware yang berjalan di Edge runtime.
// Jangan tambahkan import Node-only (mis. "node:crypto") di file ini —
// pisahkan ke auth-node.ts untuk hashing password.
const SECRET = process.env.AUTH_SECRET || "";
const COOKIE_NAME = "wo_session";
const SESSION_DAYS = 30;

function getKey(): Uint8Array {
  if (!SECRET || SECRET.length < 32) {
    throw new Error(
      "AUTH_SECRET env var harus diset dan minimal 32 karakter. Tambahkan di file .env"
    );
  }
  return new TextEncoder().encode(SECRET);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

// ---- Session JWT ----
export type SessionPayload = {
  uid: number;
  username: string;
  role: string;
};

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey());
    if (
      typeof payload.uid !== "number" ||
      typeof payload.username !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      uid: payload.uid,
      username: payload.username,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

// ---- Share access token (PIN-gated public link) ----
export type ShareTokenPayload = {
  kind: "workbook";
  clientId: number;
};

export const SHARE_TOKEN_TTL_SEC = 4 * 60 * 60; // 4 jam

export async function createShareToken(payload: ShareTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SHARE_TOKEN_TTL_SEC}s`)
    .sign(getKey());
}

export async function verifyShareToken(
  token: string
): Promise<ShareTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey());
    if (payload.kind !== "workbook") return null;
    if (typeof payload.clientId !== "number") return null;
    return { kind: "workbook", clientId: payload.clientId };
  } catch {
    return null;
  }
}

export function shareCookieName(kind: "workbook", clientId: number): string {
  return `share_${kind}_${clientId}`;
}
