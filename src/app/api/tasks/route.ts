import { prisma } from "@/lib/prisma";
import { created, ok, parseJson, serverError } from "@/lib/api-helpers";

type CreateTaskBody = {
  title: string;
  category?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assignee?: string;
  notes?: string;
  clientId?: number | null;
};

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      include: { client: { select: { id: true, names: true } } },
    });
    return ok(tasks);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseJson<CreateTaskBody>(req);
    const task = await prisma.task.create({
      data: {
        title: body.title,
        category: body.category ?? "Administration",
        status: body.status ?? "todo",
        priority: body.priority ?? "medium",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        assignee: body.assignee,
        notes: body.notes,
        clientId: body.clientId ?? null,
      },
      include: { client: { select: { id: true, names: true } } },
    });
    return created(task);
  } catch (err) {
    return serverError(err);
  }
}
