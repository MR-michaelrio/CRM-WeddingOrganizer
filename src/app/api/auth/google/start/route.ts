import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/google";
import { serverError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const url = buildAuthUrl();
    return NextResponse.redirect(url);
  } catch (err) {
    return serverError(err);
  }
}
