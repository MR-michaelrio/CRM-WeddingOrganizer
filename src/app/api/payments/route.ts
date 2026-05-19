import { prisma } from "@/lib/prisma";
import { created, ok, parseJson, serverError } from "@/lib/api-helpers";

type CreatePaymentBody = {
  clientId?: number | null;
  type: string;
  method?: string;
  amount: number;
  paymentDate: string;
  reference?: string;
  notes?: string;
};

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { paymentDate: "desc" },
      include: { client: { select: { id: true, names: true, contractValue: true } } },
    });
    return ok(payments);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseJson<CreatePaymentBody>(req);
    const payment = await prisma.payment.create({
      data: {
        clientId: body.clientId ?? null,
        type: body.type,
        method: body.method ?? "transfer",
        amount: body.amount,
        paymentDate: new Date(body.paymentDate),
        reference: body.reference,
        notes: body.notes,
      },
    });
    return created(payment);
  } catch (err) {
    return serverError(err);
  }
}
