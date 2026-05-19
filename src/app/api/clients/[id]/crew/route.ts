import { prisma } from "@/lib/prisma";
import { badRequest, created, ok, parseJson, serverError } from "@/lib/api-helpers";

type CreateAssignmentBody = {
  crewId: number;
  role?: string;
  fee?: number;
  startTime?: string;
  endTime?: string;
  attendance?: string;
};

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const clientId = Number(params.id);
    if (Number.isNaN(clientId)) return badRequest("Invalid id");
    const assignments = await prisma.crewAssignment.findMany({
      where: { clientId },
      orderBy: { createdAt: "asc" },
      include: {
        crew: {
          select: { id: true, name: true, role: true, defaultFee: true, status: true },
        },
      },
    });
    return ok(assignments);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const clientId = Number(params.id);
    if (Number.isNaN(clientId)) return badRequest("Invalid id");
    const body = await parseJson<CreateAssignmentBody>(req);
    if (!body.crewId) return badRequest("crewId required");

    const assignment = await prisma.crewAssignment.create({
      data: {
        clientId,
        crewId: body.crewId,
        role: body.role,
        fee: body.fee,
        startTime: body.startTime,
        endTime: body.endTime,
        attendance: body.attendance ?? "scheduled",
      },
      include: {
        crew: {
          select: { id: true, name: true, role: true, defaultFee: true, status: true },
        },
      },
    });
    return created(assignment);
  } catch (err) {
    return serverError(err);
  }
}
