import { prisma } from "@/lib/prisma";
import { badRequest, created, ok, parseJson, serverError } from "@/lib/api-helpers";

type CreateExpenseBody = {
  date: string;
  category: string;
  amount: number;
  method?: string;
  vendor: string;
  clientId?: number | null;
  description?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  status?: "draft" | "paid" | "void";
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status");
    const clientId = url.searchParams.get("clientId");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (clientId) where.clientId = Number(clientId);
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.gte = new Date(from);
      if (to) range.lte = new Date(to);
      where.date = range;
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      include: { client: { select: { id: true, names: true } } },
    });
    return ok(expenses);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseJson<CreateExpenseBody>(req);
    if (!body.date) return badRequest("date required");
    if (!body.category?.trim()) return badRequest("category required");
    if (!body.vendor?.trim()) return badRequest("vendor required");
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return badRequest("amount must be > 0");
    }

    const expense = await prisma.expense.create({
      data: {
        date: new Date(body.date),
        category: body.category.trim(),
        amount,
        method: body.method ?? "transfer",
        vendor: body.vendor.trim(),
        clientId: body.clientId ?? null,
        description: body.description ?? null,
        attachmentUrl: body.attachmentUrl ?? null,
        attachmentName: body.attachmentName ?? null,
        status: body.status ?? "draft",
      },
      include: { client: { select: { id: true, names: true } } },
    });
    return created(expense);
  } catch (err) {
    return serverError(err);
  }
}
