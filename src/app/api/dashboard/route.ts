import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      eventsThisMonth,
      upcomingEvents,
      activities,
      crewSchedule,
      monthPayments,
      outstandingClients,
      taskStats,
    ] = await Promise.all([
      prisma.client.count({
        where: { eventDate: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.client.findMany({
        where: { eventDate: { gte: now }, status: { not: "completed" } },
        orderBy: { eventDate: "asc" },
        take: 5,
        include: { pic: { select: { name: true } } },
      }),
      prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.crew.findMany({
        where: { status: "scheduled" },
        orderBy: { name: "asc" },
        take: 5,
      }),
      prisma.payment.aggregate({
        where: { paymentDate: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      prisma.client.findMany({
        select: { id: true, contractValue: true, payments: { select: { amount: true } } },
        where: { status: { in: ["active", "planning"] } },
      }),
      prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    // Calculate outstanding payments
    const outstanding = outstandingClients.reduce((sum, c) => {
      const total = Number(c.contractValue ?? 0);
      const paid = c.payments.reduce((s, p) => s + Number(p.amount), 0);
      return sum + Math.max(0, total - paid);
    }, 0);

    const doneCount =
      taskStats.find((t) => t.status === "done")?._count._all ?? 0;
    const totalTasks = taskStats.reduce((s, t) => s + t._count._all, 0);
    const taskProgress = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

    return ok({
      stats: {
        eventsThisMonth,
        monthlyRevenue: Number(monthPayments._sum.amount ?? 0),
        outstanding,
        taskProgress,
      },
      upcomingEvents,
      activities,
      crewSchedule,
    });
  } catch (err) {
    return serverError(err);
  }
}
