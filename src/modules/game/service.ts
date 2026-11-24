import { Game, Prisma, Ticket } from "@prisma/client";
import { prisma } from "../../config/db";
import { getIo } from "../../config/socket";
import { generateTicket, TicketNumbers } from "../../utils/ticketGenerator";
import {
  CLAIM_WINDOW_MS,
  computePrize,
  findCompletedRows,
  roundTo2,
} from "../../utils/prizeCalculator";
import { badRequest, forbidden, notFound } from "../../utils/errors";

const TX_OPTIONS = { maxWait: 5000, timeout: 10000 };

// ============================== DTO ==============================

export const gameStats = async (gameId: string) => {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { totalFund: true },
  });
  const activeTickets = await prisma.ticket.count({ where: { gameId } });
  const players = await prisma.ticket.findMany({
    where: { gameId },
    distinct: ["userId"],
    select: { userId: true },
  });
  return {
    totalFund: Number(game?.totalFund ?? 0),
    activeTickets,
    activePlayers: players.length,
  };
};

export const toGameDto = async (game: Game) => ({
  id: game.id,
  status: game.status,
  ticketPrice: Number(game.ticketPrice),
  totalFund: Number(game.totalFund),
  carryOverFund: Number(game.carryOverFund),
  currentFund: roundTo2(Number(game.totalFund) - Number(game.carryOverFund)),
  callerMode: game.callerMode,
  autoInterval: game.autoInterval,
  currentNumber: game.currentNumber,
  calledNumbers: game.calledNumbers,
  createdAt: game.createdAt,
  startedAt: game.startedAt,
  endedAt: game.endedAt,
  stats: await gameStats(game.id),
});

export const broadcastStats = async (gameId: string): Promise<void> => {
  const stats = await gameStats(gameId);
  getIo().emit("game:stats-updated", { gameId, ...stats });
};

// ============================== Бозии ҷорӣ / лобби ==============================

export const getCurrentGame = async () => {
  const game = await prisma.game.findFirst({
    where: { status: { in: ["WAITING", "ACTIVE"] } },
    orderBy: { createdAt: "desc" },
  });
  return game ? toGameDto(game) : null;
};

export const getLobby = async (userId: string) => {
  const upcoming = await prisma.game.findFirst({
    where: { status: "WAITING" },
    orderBy: { createdAt: "desc" },
  });

  const history = await prisma.game.findMany({
    where: { status: "FINISHED" },
    orderBy: { endedAt: "desc" },
    take: 10,
    select: { id: true, endedAt: true, ticketPrice: true, totalFund: true },
  });

  const historyWithResult = await Promise.all(
    history.map(async (g) => {
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
        ticketPrice: Number(g.ticketPrice),
        totalFund: Number(g.totalFund),
        tickets,
        wonAmount: roundTo2(gross - commission),
      };
    })
  );

  return { upcoming: upcoming ? await toGameDto(upcoming) : null, history: historyWithResult };
};

// ============================== Хариди билет ==============================

export const buyTicket = async (
  userId: string,
  gameId: string | undefined,
  quantity: number
) => {
  const target =
    gameId ??
    (
      await prisma.game.findFirst({
        where: { status: "WAITING" },
        orderBy: { createdAt: "desc" },
      })
    )?.id;

  if (!target) throw notFound("Бозии фаъол ёфт нашуд");

  const result = await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({ where: { id: target } });
    if (!game) throw notFound("Бози ёфт нашуд");
    if (game.status !== "WAITING") {
      throw badRequest("Хариди билет танҳо то оғози бози мумкин аст");
    }

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound("Корбар ёфт нашуд");

    const freeUsed = Math.min(user.freeTickets, quantity);
    const paidQty = quantity - freeUsed;
    const price = Number(game.ticketPrice);
    const cost = roundTo2(price * paidQty);

    // Шарти атомарӣ: баланс ҳеҷ гоҳ манфӣ намешавад
    const updated = await tx.user.updateMany({
      where: { id: userId, balance: cost > 0 ? { gte: cost } : undefined },
      data: {
        balance: cost > 0 ? { decrement: cost } : undefined,
        freeTickets: freeUsed > 0 ? { decrement: freeUsed } : undefined,
      },
    });
    if (updated.count === 0) {
      throw badRequest("Баланси шумо нокифоя аст");
    }

    const ticketsData = Array.from({ length: quantity }, () => ({
      gameId: target,
      userId,
      numbers: generateTicket() as unknown as Prisma.InputJsonValue,
    }));
    await tx.ticket.createMany({ data: ticketsData });

    // 10% ба барнома, 90% ба фонди ҷоиза
    await tx.game.update({
      where: { id: target },
      data: { totalFund: { increment: roundTo2(price * quantity * 0.9) } },
    });

    if (cost > 0) {
      await tx.transaction.create({
        data: {
          userId,
          type: "TICKET_BUY",
          amount: cost,
          status: "CONFIRMED",
          note: `Хариди ${quantity} билет${freeUsed > 0 ? ` (${freeUsed} ройгон)` : ""}`,
        },
      });
    }

    return { freeUsed, paidQty, cost, price };
  }, TX_OPTIONS);

  await broadcastStats(target);
  return { gameId: target, quantity, ...result };
};

// ============================== Санҷиши бурд пас аз ҳар рақам ==============================

const schedulePrizeExpiry = (
  prizeLogId: string,
  userId: string,
  ticketId: string,
  round: number
) => {
  setTimeout(async () => {
    try {
      const updated = await prisma.prizeLog.updateMany({
        where: { id: prizeLogId, status: "PENDING" },
        data: { status: "EXPIRED", expiredAt: new Date() },
      });
      if (updated.count > 0) {
        getIo().to(`user:${userId}`).emit("game:prize-expired", { ticketId, round });
        console.log(`[prize] EXPIRED: ticket ${ticketId.slice(0, 8)} round ${round}`);
      }
    } catch (e) {
      console.error("[prize] хато дар expiry:", e);
    }
  }, CLAIM_WINDOW_MS);
};

/** Баъд аз хондани рақам ҳамаи билетҳои бози санҷида мешаванд */
export const checkPrizesAfterNumber = async (gameId: string): Promise<void> => {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return;

  const called = new Set(game.calledNumbers);
  const totalFund = Number(game.totalFund);
  const tickets = await prisma.ticket.findMany({ where: { gameId } });

  for (const ticket of tickets) {
    const numbers = ticket.numbers as unknown as TicketNumbers;
    const completed = findCompletedRows(numbers, called, {
      row1: ticket.row1Done,
      row2: ticket.row2Done,
      row3: ticket.row3Done,
    });

    for (const round of completed) {
      const { prizeAmount, commission } = computePrize(totalFund, round);

      const prize = await prisma.prizeLog.create({
        data: {
          gameId,
          ticketId: ticket.id,
          userId: ticket.userId,
          round,
          prizeAmount,
          commission,
        },
      });

      await prisma.ticket.update({
        where: { id: ticket.id },
        data:
          round === 1
            ? { row1Done: true }
            : round === 2
              ? { row2Done: true }
              : { row3Done: true },
      });

      // Ҷоиза ба бозингар эълон мешавад — 30 сония барои тасдиқ
      getIo().to(`user:${ticket.userId}`).emit("game:prize-available", {
        prizeLogId: prize.id,
        ticketId: ticket.id,
        gameId,
        round,
        amount: roundTo2(prizeAmount - commission),
        description: round === 1 ? "Билети ройгон" : "Ҷоизаи пулӣ",
        expiresIn: CLAIM_WINDOW_MS / 1000,
      });
      console.log(
        `[prize] PENDING: ticket ${ticket.id.slice(0, 8)} round ${round} amount ${roundTo2(prizeAmount - commission)}`
      );

      schedulePrizeExpiry(prize.id, ticket.userId, ticket.id, round);
    }
  }
};

// ============================== Claim (тасдиқи бурд) ==============================

export const claimPrize = async (
  userId: string,
  ticketId: string,
  gameId: string,
  round: number
) => {
  const prize = await prisma.prizeLog.findFirst({ where: { ticketId, gameId, round } });
  if (!prize) throw notFound("Ҷоиза ёфт нашуд");
  if (prize.userId !== userId) throw forbidden("Ин ҷоиза ба шумо тааллуқ надорад");
  if (prize.status === "CLAIMED") throw badRequest("Ҷоиза аллакай тасдиқ шудааст");
  if (prize.status === "EXPIRED") throw badRequest("Вақти тасдиқи ҷоиза гузаштааст");

  const deadline = new Date(prize.createdAt.getTime() + CLAIM_WINDOW_MS);
  if (Date.now() > deadline.getTime()) {
    await prisma.prizeLog.update({
      where: { id: prize.id },
      data: { status: "EXPIRED", expiredAt: new Date() },
    });
    throw badRequest("Вақти тасдиқи ҷоиза гузаштааст");
  }

  const netAmount = roundTo2(Number(prize.prizeAmount) - Number(prize.commission));

  await prisma.$transaction(async (tx) => {
    await tx.prizeLog.update({
      where: { id: prize.id },
      data: { status: "CLAIMED", claimedAt: new Date() },
    });

    if (round === 1) {
      // Ҷоизаи сатри 1 — билети ройгон барои бозии навбатӣ
      await tx.user.update({
        where: { id: userId },
        data: { freeTickets: { increment: 1 } },
      });
    } else {
      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: netAmount } },
      });
      await tx.transaction.create({
        data: {
          userId,
          type: "PRIZE",
          amount: netAmount,
          status: "CONFIRMED",
          note: `Бурд — сатри ${round}`,
        },
      });
    }
  }, TX_OPTIONS);

  getIo().emit("game:prize-won", {
    ticketId,
    userId,
    round,
    amount: round === 1 ? 0 : netAmount,
  });
  await broadcastStats(gameId);

  console.log(`[prize] CLAIMED: ticket ${ticketId.slice(0, 8)} round ${round} net ${netAmount}`);
  return { round, amount: round === 1 ? 0 : netAmount, freeTicket: round === 1 };
};

// ============================== Leaderboard ==============================

export const getLeaderboard = async (gameId: string) => {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw notFound("Бози ёфт нашуд");

  const called = new Set(game.calledNumbers);
  const tickets = await prisma.ticket.findMany({
    where: { gameId },
    include: { user: { select: { id: true, name: true } } },
  });

  const rows = tickets.map((t: Ticket & { user: { id: string; name: string } }) => {
    const numbers = t.numbers as unknown as TicketNumbers;
    const numbersArr = [numbers.row1, numbers.row2, numbers.row3];
    const done = [t.row1Done, t.row2Done, t.row3Done];
    const completedRows = done.filter(Boolean).length;
    const nextRowIdx = done.findIndex((d) => !d);
    const remaining =
      nextRowIdx === -1
        ? null
        : numbersArr[nextRowIdx].filter((n) => !called.has(n)).length;
    return {
      ticketId: t.id,
      userId: t.user.id,
      name: t.user.name,
      completedRows,
      remaining,
    };
  });

  const closest = rows
    .filter((r) => r.remaining !== null)
    .sort(
      (a, b) =>
        b.completedRows - a.completedRows || (a.remaining as number) - (b.remaining as number)
    )
    .slice(0, 3);

  const playersMap = new Map<string, { userId: string; name: string; tickets: number }>();
  for (const r of rows) {
    const existing = playersMap.get(r.userId);
    if (existing) existing.tickets += 1;
    else playersMap.set(r.userId, { userId: r.userId, name: r.name, tickets: 1 });
  }

  return { closest, players: [...playersMap.values()] };
};

// ============================== Идораи бози (барои admin) ==============================

export const createGame = async (ticketPrice: number, autoInterval: number) => {
  const active = await prisma.game.findFirst({
    where: { status: { in: ["WAITING", "ACTIVE"] } },
  });
  if (active) {
    throw badRequest("Бозии фаъол мавҷуд аст — аввал онро анҷом диҳед");
  }

  const last = await prisma.game.findFirst({
    where: { status: "FINISHED" },
    orderBy: { endedAt: "desc" },
  });
  const carryOverFund = Number(last?.carryOverFund ?? 0);

  const game = await prisma.game.create({
    data: { ticketPrice, autoInterval, carryOverFund, totalFund: carryOverFund },
  });

  getIo().emit("game:status-changed", { gameId: game.id, status: "WAITING" });
  console.log(
    `[game] Бозии нав сохта шуд: ${game.id.slice(0, 8)} нарх=${ticketPrice} carryOver=${carryOverFund}`
  );
  return toGameDto(game);
};

export const startGame = async (gameId: string) => {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw notFound("Бози ёфт нашуд");
  if (game.status !== "WAITING") throw badRequest("Бози танҳо аз ҳолати WAITING оғоз мешавад");

  const updated = await prisma.game.update({
    where: { id: gameId },
    data: { status: "ACTIVE", startedAt: new Date() },
  });

  getIo().emit("game:status-changed", { gameId, status: "ACTIVE" });
  return toGameDto(updated);
};

export const finishGame = async (gameId: string) => {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw notFound("Бози ёфт нашуд");
  if (game.status === "FINISHED") throw badRequest("Бози аллакай анҷом ёфтааст");

  // Ҷоизаҳои тасдиқнашуда беэътибор мешаванд
  await prisma.prizeLog.updateMany({
    where: { gameId, status: "PENDING" },
    data: { status: "EXPIRED", expiredAt: new Date() },
  });

  const claimed = await prisma.prizeLog.aggregate({
    where: { gameId, status: "CLAIMED" },
    _sum: { prizeAmount: true },
  });
  const paidOut = Number(claimed._sum.prizeAmount ?? 0);
  // carry-over: фонди боқимонда ба бозии навбатӣ мегузарад
  const remaining = Math.max(0, roundTo2(Number(game.totalFund) - paidOut));

  const finished = await prisma.game.update({
    where: { id: gameId },
    data: { status: "FINISHED", endedAt: new Date(), carryOverFund: remaining },
  });

  getIo().emit("game:status-changed", { gameId, status: "FINISHED" });
  console.log(
    `[game] Бози ${gameId.slice(0, 8)} анҷом ёфт. Пардохт: ${paidOut}, carry-over: ${remaining}`
  );
  return { ...(await toGameDto(finished)), paidOut };
};
