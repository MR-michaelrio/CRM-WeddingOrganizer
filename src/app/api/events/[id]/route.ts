import { prisma } from "@/lib/prisma";
import { badRequest, ok, parseJson, serverError } from "@/lib/api-helpers";
import { deleteCalendarEvent } from "@/lib/google";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");
    const body = await parseJson<Record<string, unknown>>(req);
    const data: Record<string, unknown> = { ...body };
    if (typeof body.startAt === "string") data.startAt = new Date(body.startAt);
    if (typeof body.endAt === "string") data.endAt = new Date(body.endAt);
    const event = await prisma.calendarEvent.update({ where: { id }, data });
    return ok(event);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) return badRequest("Invalid id");

    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (existing?.googleEventId) {
      try {
        await deleteCalendarEvent(existing.googleEventId);
      } catch (err) {
        console.warn(
          "[events DELETE] could not delete from Google Calendar (proceeding):",
          err
        );
      }
    }

    await prisma.calendarEvent.delete({ where: { id } });
    return ok({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
