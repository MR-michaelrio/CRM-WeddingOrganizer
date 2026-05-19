import { prisma } from "@/lib/prisma";
import { ok, parseJson, serverError } from "@/lib/api-helpers";

type ReorderBody = {
  taskId: number;
  status: string;
  position: number;
};

export async function POST(req: Request) {
  try {
    const body = await parseJson<ReorderBody>(req);
    const task = await prisma.task.update({
      where: { id: body.taskId },
      data: { status: body.status, position: body.position },
    });
    return ok(task);
  } catch (err) {
    return serverError(err);
  }
}
