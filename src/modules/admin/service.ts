import { prisma } from "../../config/db";
import { getIo } from "../../config/socket";
import { toTransactionDto } from "../wallet/service";
import { badRequest, notFound } from "../../utils/errors";

const TX_OPTIONS = { maxWait: 5000, timeout: 10000 };

// ============================== Молия ==============================

export const listDeposits = async (status?: "PENDING" | "CONFIRMED" | "REJECTED") => {
  const list = await prisma.transaction.findMany({
    where: { type: "DEPOSIT", ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { id: true, name: true, phone: true } } },
  });
  return list.map((t) => ({
    ...toTransactionDto(t),
    user: t.user,
  }));
};

/** Тасдиқи пардохт — бо имкони ислоҳи маблаг */
export const confirmDeposit = async (id: string, correctedAmount?: number) => {
  const result = await prisma.$transaction(async (tx) => {
    const deposit = await tx.transaction.findUnique({ where: { id } });
    if (!deposit) throw notFound("Транзаксия ёфт нашуд");
    if (deposit.type !== "DEPOSIT") throw badRequest("Ин транзаксия пардохт нест");
    if (deposit.status !== "PENDING") throw badRequest(`Транзаксия аллакай ${deposit.status}`);

    const amount = correctedAmount ?? Number(deposit.amount);
    const note =
      correctedAmount !== undefined && correctedAmount !== Number(deposit.amount)
        ? `${deposit.note ?? ""} (маблаги ислоҳшуда: ${amount})`.trim()
        : deposit.note;

    const updated = await tx.transaction.update({
      where: { id },
      data: { status: "CONFIRMED", confirmedAt: new Date(), amount, note },
    });

    await tx.user.update({
      where: { id: deposit.userId },
      data: { balance: { increment: amount } },
    });

    return updated;
  }, TX_OPTIONS);

  const dto = {
    ...toTransactionDto(result),
    user: await prisma.user.findUnique({
      where: { id: result.userId },
      select: { id: true, name: true, phone: true },
    }),
  };
  getIo().to("admins").emit("admin:deposit-updated", dto);
  return dto;
};

export const rejectDeposit = async (id: string) => {
  const deposit = await prisma.transaction.findUnique({ where: { id } });
  if (!deposit) throw notFound("Транзаксия ёфт нашуд");
  if (deposit.status !== "PENDING") throw badRequest(`Транзаксия аллакай ${deposit.status}`);

  const updated = await prisma.transaction.update({
    where: { id },
    data: { status: "REJECTED", confirmedAt: new Date() },
  });

  const dto = {
    ...toTransactionDto(updated),
    user: await prisma.user.findUnique({
      where: { id: updated.userId },
      select: { id: true, name: true, phone: true },
    }),
  };
  getIo().to("admins").emit("admin:deposit-updated", dto);
  return dto;
};

// ============================== Бозингарон ==============================

export const listPlayers = async (search?: string) => {
  const players = await prisma.user.findMany({
    where: {
      role: "PLAYER",
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      phone: true,
      balance: true,
      freeTickets: true,
      isBlocked: true,
      createdAt: true,
    },
  });
  return players.map((p) => ({ ...p, balance: Number(p.balance) }));
};

export const setPlayerBlocked = async (id: string, blocked: boolean) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound("Бозингар ёфт нашуд");
  if (user.role === "ADMIN") throw badRequest("Админро блок кардан мумкин нест");

  const updated = await prisma.user.update({
    where: { id },
    data: { isBlocked: blocked },
    select: {
      id: true,
      name: true,
      phone: true,
      balance: true,
      freeTickets: true,
      isBlocked: true,
    },
  });
  return { ...updated, balance: Number(updated.balance) };
};

// ============================== Омор ==============================

const since = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export const getAdminStats = async () => {
  const [today, week, month] = [1, 7, 30].map(since);

  const periodIncome = async (from: Date) => {
    const deposits = await prisma.transaction.aggregate({
      where: { type: "DEPOSIT", status: "CONFIRMED", confirmedAt: { gte: from } },
      _sum: { amount: true },
    });
    const commission = await prisma.prizeLog.aggregate({
      where: { status: "CLAIMED", claimedAt: { gte: from } },
      _sum: { commission: true },
    });
    return {
      deposits: Number(deposits._sum.amount ?? 0),
      commission: Number(commission._sum.commission ?? 0),
    };
  };

  const [todayIncome, weekIncome, monthIncome] = await Promise.all([
    periodIncome(today),
    periodIncome(week),
    periodIncome(month),
  ]);

  const activeGame = await prisma.game.findFirst({
    where: { status: { in: ["WAITING", "ACTIVE"] } },
    orderBy: { createdAt: "desc" },
  });
  const activePlayers = activeGame
    ? (
        await prisma.ticket.findMany({
          where: { gameId: activeGame.id },
          distinct: ["userId"],
          select: { userId: true },
        })
      ).length
    : 0;

  const finishedGames = await prisma.game.count({ where: { status: "FINISHED" } });
  const pendingDeposits = await prisma.transaction.count({
    where: { type: "DEPOSIT", status: "PENDING" },
  });
  const totalPlayers = await prisma.user.count({ where: { role: "PLAYER" } });

  return {
    income: {
      today: todayIncome,
      week: weekIncome,
      month: monthIncome,
    },
    activePlayers,
    finishedGames,
    pendingDeposits,
    totalPlayers,
  };
};
