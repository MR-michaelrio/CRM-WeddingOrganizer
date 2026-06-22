import { ok, serverError } from "@/lib/api-helpers";
import {
  checkBakiConflicts,
  formatAdjacentWarning,
  formatSameDayError,
} from "@/lib/baki-conflicts";
import { parseJenisBakiList } from "@/lib/jenis-baki";

// GET /api/clients/baki-conflicts?date=YYYY-MM-DD&jenisBaki=Gold,Terarium&eventType=...&excludeId=12
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") ?? "";
    const jenisBaki = parseJenisBakiList(url.searchParams.get("jenisBaki"));
    const eventType = url.searchParams.get("eventType") ?? undefined;
    const excludeRaw = url.searchParams.get("excludeId");
    const excludeId = excludeRaw ? Number(excludeRaw) : undefined;

    if (!date || jenisBaki.length === 0) {
      return ok({ sameDay: [], adjacent: [], sameDayMessage: null, adjacentMessage: null });
    }

    const result = await checkBakiConflicts({
      date,
      jenisBaki,
      eventType,
      excludeId: excludeId && !Number.isNaN(excludeId) ? excludeId : undefined,
    });
    return ok({
      ...result,
      sameDayMessage: result.sameDay.length ? formatSameDayError(result.sameDay) : null,
      adjacentMessage: result.adjacent.length
        ? formatAdjacentWarning(result.adjacent)
        : null,
    });
  } catch (err) {
    return serverError(err);
  }
}
