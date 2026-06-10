import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth";

// Route yang boleh diakses tanpa login.
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/setup",
  "/api/auth/me",
];
const PUBLIC_PREFIXES = ["/share/", "/api/share/", "/_next/", "/favicon"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Static assets di /uploads & file2 statis lain biarkan lewat.
  if (pathname.startsWith("/uploads/")) return NextResponse.next();
  if (pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?|css|js|map)$/))
    return NextResponse.next();

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    // Untuk request API: balas 401 supaya frontend bisa handle.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Untuk page route: redirect ke /login dengan next URL.
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Hindari match file statis (handled di func juga, tapi mempersempit di sini).
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|woff2?|css|js)$).*)",
  ],
};
