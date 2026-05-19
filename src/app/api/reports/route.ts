import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api-helpers";

const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export async function GET() {
  try {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [allPayments, allClients, vendors, crew] = await Promise.all([
      prisma.payment.findMany({
        where: { paymentDate: { gte: yearStart } },
        select: { amount: true, paymentDate: true },
      }),
      prisma.client.findMany({
        select: { id: true, eventType: true, contractValue: true, status: true },
      }),
      prisma.vendor.findMany({ orderBy: { projects: "desc" }, take: 5 }),
      prisma.crew.findMany({ orderBy: [{ projects: "desc" }, { rating: "desc" }], take: 4 }),
    ]);

    // Monthly revenue (last 6 months)
    const monthlyRevenue: { month: string; value: number; events: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d;
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthPayments = allPayments.filter(
        (p) => p.paymentDate >= start && p.paymentDate <= end
      );
      const value = monthPayments.reduce((s, p) => s + Number(p.amount), 0);
      monthlyRevenue.push({
        month: MONTHS_ID[d.getMonth()]!,
        value: Math.round(value / 1_000_000), // in millions
        events: 0,
      });
    }

    // Event type breakdown
    const typeMap = new Map<string, number>();
    for (const c of allClients) {
      typeMap.set(c.eventType, (typeMap.get(c.eventType) ?? 0) + 1);
    }
    const eventTypes = Array.from(typeMap, ([type, count]) => ({ type, count })).sort(
      (a, b) => b.count - a.count
    );

    // YTD revenue + events
    const totalRevenue = allPayments.reduce((s, p) => s + Number(p.amount), 0);
    const totalEvents = allClients.length;
    const avgValue =
      allClients.length > 0
        ? allClients.reduce((s, c) => s + Number(c.contractValue ?? 0), 0) /
          allClients.length
        : 0;

    return ok({
      stats: {
        totalEvents,
        totalRevenue,
        avgValue,
        activeCrew: crew.length,
      },
      monthlyRevenue,
      eventTypes,
      vendors,
      crew,
    });
  } catch (err) {
    return serverError(err);
  }
}
