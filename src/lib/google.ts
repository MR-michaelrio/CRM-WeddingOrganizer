import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

function envConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google OAuth env vars missing. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in .env"
    );
  }
  return { clientId, clientSecret, redirectUri };
}

export function makeOAuth2Client(): OAuth2Client {
  const { clientId, clientSecret, redirectUri } = envConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function buildAuthUrl(): string {
  const oauth2 = makeOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh token every time
    scope: SCOPES,
    include_granted_scopes: true,
  });
}

/** Exchange the authorization code for tokens & persist them to DB. */
export async function exchangeCodeAndSave(code: string) {
  const oauth2 = makeOAuth2Client();
  const { tokens } = await oauth2.getToken(code);

  if (!tokens.access_token) {
    throw new Error("Google did not return an access token");
  }
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Disconnect at myaccount.google.com/permissions and try again."
    );
  }

  // Fetch user email
  oauth2.setCredentials(tokens);
  const oauth2api = google.oauth2({ auth: oauth2, version: "v2" });
  const userinfo = await oauth2api.userinfo.get();
  const email = userinfo.data.email ?? "unknown";

  const expiry = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600_000);

  await prisma.googleAccount.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiry,
      scope: tokens.scope ?? SCOPES.join(" "),
    },
    update: {
      email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiry,
      scope: tokens.scope ?? SCOPES.join(" "),
    },
  });

  return { email };
}

/** Get an authenticated OAuth2 client, refreshing tokens if needed. */
export async function getAuthorizedClient(): Promise<OAuth2Client> {
  const account = await prisma.googleAccount.findUnique({ where: { id: 1 } });
  if (!account) {
    throw new Error(
      "Google account not connected. Connect via Settings → Google Account first."
    );
  }

  const oauth2 = makeOAuth2Client();
  oauth2.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.expiry.getTime(),
    scope: account.scope,
  });

  // Auto-persist new access token when googleapis refreshes it
  oauth2.on("tokens", async (tokens) => {
    if (!tokens.access_token) return;
    await prisma.googleAccount.update({
      where: { id: 1 },
      data: {
        accessToken: tokens.access_token,
        expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : new Date(Date.now() + 3600_000),
        // refresh_token only set when re-consented; keep existing otherwise
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
      },
    });
  });

  return oauth2;
}

/** Disconnect: revoke at Google, then delete from DB. */
export async function disconnectGoogle() {
  const account = await prisma.googleAccount.findUnique({ where: { id: 1 } });
  if (!account) return;
  try {
    const oauth2 = makeOAuth2Client();
    oauth2.setCredentials({ refresh_token: account.refreshToken });
    await oauth2.revokeCredentials();
  } catch (err) {
    console.warn("[google] revoke failed (proceeding anyway):", err);
  }
  await prisma.googleAccount.delete({ where: { id: 1 } });
}

/** Create a Calendar event with a Meet link attached. */
export async function createCalendarEventWithMeet(opts: {
  summary: string;
  description?: string | null;
  location?: string | null;
  startAt: Date;
  endAt: Date;
}): Promise<{ eventId: string; meetLink: string | null; htmlLink: string | null }> {
  const auth = await getAuthorizedClient();
  const calendar = google.calendar({ version: "v3", auth });

  const requestId = `wo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const res = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    requestBody: {
      summary: opts.summary,
      description: opts.description ?? undefined,
      location: opts.location ?? undefined,
      start: {
        dateTime: opts.startAt.toISOString(),
        timeZone: "Asia/Jakarta",
      },
      end: {
        dateTime: opts.endAt.toISOString(),
        timeZone: "Asia/Jakarta",
      },
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  return {
    eventId: res.data.id ?? "",
    meetLink: res.data.hangoutLink ?? null,
    htmlLink: res.data.htmlLink ?? null,
  };
}

export async function deleteCalendarEvent(googleEventId: string) {
  const auth = await getAuthorizedClient();
  const calendar = google.calendar({ version: "v3", auth });
  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
    });
  } catch (err: unknown) {
    const status = (err as { code?: number }).code;
    if (status === 404 || status === 410) return; // already gone
    throw err;
  }
}
