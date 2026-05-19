import { prisma } from "@/lib/prisma";
import { created, ok, parseJson, serverError } from "@/lib/api-helpers";
import { createCalendarEventWithMeet } from "@/lib/google";

type CreateEventBody = {
  title: string;
  type?: string;
  startAt: string;
  endAt?: string;
  location?: string;
  notes?: string;
  meetLink?: string;
  clientId?: number | null;
  createGoogleMeet?: boolean; // when true, call Google Calendar API
};

export async function GET() {
  try {
    const events = await prisma.calendarEvent.findMany({
      orderBy: { startAt: "asc" },
      include: { client: { select: { id: true, names: true } } },
    });
    return ok(events);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseJson<CreateEventBody>(req);

    const startAt = new Date(body.startAt);
    const endAt = body.endAt
      ? new Date(body.endAt)
      : new Date(startAt.getTime() + 60 * 60_000);

    let meetLink: string | null = body.meetLink ?? null;
    let googleEventId: string | null = null;

    if (body.createGoogleMeet) {
      try {
        const googleEvent = await createCalendarEventWithMeet({
          summary: body.title,
          description: body.notes,
          location: body.location,
          startAt,
          endAt,
        });
        googleEventId = googleEvent.eventId || null;
        meetLink = googleEvent.meetLink ?? meetLink;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Google Calendar API failed";
        return new Response(
          JSON.stringify({ error: `Google Meet creation failed: ${message}` }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title: body.title,
        type: body.type ?? "meeting",
        startAt,
        endAt: body.endAt ? endAt : null,
        location: body.location,
        notes: body.notes,
        meetLink,
        googleEventId,
        clientId: body.clientId ?? null,
      },
      include: { client: { select: { id: true, names: true } } },
    });

    return created(event);
  } catch (err) {
    return serverError(err);
  }
}
