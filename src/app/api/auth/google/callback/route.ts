import { NextResponse } from "next/server";
import { exchangeCodeAndSave } from "@/lib/google";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const errParam = url.searchParams.get("error");
const origin =
  process.env.APP_URL || "https://home.eclipsegroup.web.id";
  if (errParam) {
    return NextResponse.redirect(
      `${origin}/settings?google_error=${encodeURIComponent(errParam)}`
    );
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/settings?google_error=missing_code`);
  }

  try {
    const { email } = await exchangeCodeAndSave(code);
    return NextResponse.redirect(
      `${origin}/settings?google_connected=${encodeURIComponent(email)}`
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to exchange Google code";
    return NextResponse.redirect(
      `${origin}/settings?google_error=${encodeURIComponent(message)}`
    );
  }
}
