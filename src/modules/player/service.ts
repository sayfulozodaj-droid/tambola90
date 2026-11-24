import bcrypt from "bcryptjs";
import { prisma } from "../../config/db";
import { toPublicUser } from "../auth/service";
import { badRequest, unauthorized } from "../../utils/errors";

/** Омори бозингар: бозиҳо, бурдҳо, маблаги умумии бурд */
export const getPlayerStats = async (userId: string) => {
  const games = await prisma.ticket.findMany({
    where: { userId },
    distinct: ["gameId"],
    select: { gameId: true },
  });
  const won = await prisma.prizeLog.aggregate({
    where: { userId, status: "CLAIMED" },
    _sum: { prizeAmount: true, commission: true },
  });
  const wins = await prisma.prizeLog.count({ where: { userId, status: "CLAIMED" } });
  const gross = Number(won._sum.prizeAmount ?? 0);
  const commission = Number(won._sum.commission ?? 0);
  return {
    games: games.length,
    wins,
    totalWon: Math.round((gross - commission) * 100) / 100,
  };
};

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized();
  const stats = await getPlayerStats(userId);
  return { ...toPublicUser(user), stats };
};

export const updateProfile = async (userId: string, name: string) => {
  const user = await prisma.user.update({ where: { id: userId }, data: { name } });
  return toPublicUser(user);
};

export const getBalance = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized();
  return { balance: Number(user.balance), freeTickets: user.freeTickets };
};

/** Билетҳои ман дар бозии ҷорӣ */
export const getMyTickets = async (userId: string) => {
  const game = await prisma.game.findFirst({
    where: { status: { in: ["WAITING", "ACTIVE"] } },
    orderBy: { createdAt: "desc" },
  });

  if (!game) {
    return { game: null, tickets: [] };
  }

  const tickets = await prisma.ticket.findMany({
    where: { gameId: game.id, userId },
    orderBy: { id: "asc" },
  });

  return {
    game: {
      id: game.id,
      status: game.status,
      calledNumbers: game.calledNumbers,
      currentNumber: game.currentNumber,
      totalFund: Number(game.totalFund),
    },
    tickets: tickets.map((t) => ({
      id: t.id,
      numbers: t.numbers,
      row1Done: t.row1Done,
      row2Done: t.row2Done,
      row3Done: t.row3Done,
    })),
  };
};

/** Таърихи бозиҳои ман */
export const getMyHistory = async (userId: string) => {
  const games = await prisma.game.findMany({
    where: {
      status: "FINISHED",
      tickets: { some: { userId } },
    },
    orderBy: { endedAt: "desc" },
    take: 20,
    select: { id: true, endedAt: true, totalFund: true },
  });

  const items = await Promise.all(
    games.map(async (g) => {
      const tickets = await prisma.ticket.count({ where: { gameId: g.id, userId } });
      const won = await prisma.prizeLog.aggregate({
        where: { gameId: g.id, userId, status: "CLAIMED" },
        _sum: { prizeAmount: true, commission: true },
      });
      const gross = Number(won._sum.prizeAmount ?? 0);
      const commission = Number(won._sum.commission ?? 0);
      return {
        id: g.id,
        endedAt: g.endedAt,
        totalFund: Number(g.totalFund),
        tickets,
        wonAmount: Math.round((gross - commission) * 100) / 100,
      };
    })
  );

  const stats = await getPlayerStats(userId);
  return { stats, games: items };
};

export const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized();

  const ok = await bcrypt.compare(oldPassword, user.password);
  if (!ok) throw badRequest("Пароли ҷорӣ нодуруст аст");

  await prisma.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(newPassword, 10) },
  });
};
