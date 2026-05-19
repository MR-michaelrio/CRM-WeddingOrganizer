import { prisma } from "@/lib/prisma";
import { ok, parseJson, serverError } from "@/lib/api-helpers";

async function getOrCreate() {
  let setting = await prisma.setting.findUnique({ where: { id: 1 } });
  if (!setting) {
    setting = await prisma.setting.create({ data: { id: 1 } });
  }
  return setting;
}

export async function GET() {
  try {
    const setting = await getOrCreate();
    return ok(setting);
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await parseJson<Record<string, unknown>>(req);
    await getOrCreate();
    const setting = await prisma.setting.update({ where: { id: 1 }, data: body });
    return ok(setting);
  } catch (err) {
    return serverError(err);
  }
}
