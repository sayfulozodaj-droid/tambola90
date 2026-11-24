import { prisma } from "../config/db";
import { getIo } from "../config/socket";
import { checkPrizesAfterNumber, broadcastStats } from "../modules/game/service";

const activeTimers = new Map<string, NodeJS.Timeout>();

const pickRandomUncalled = (called: number[]): number | null => {
  const calledSet = new Set(called);
  const remaining: number[] = [];
  for (let n = 1; n <= 90; n++) {
    if (!calledSet.has(n)) remaining.push(n);
  }
  if (remaining.length === 0) return null;
  return remaining[Math.floor(Math.random() * remaining.length)];
};

/**
 * Хондани рақами навбатӣ (барои режими AUTO ва MANUAL).
 * Рақами тасодуфии нахондашуда интихоб, ба ҳама эълон ва санҷиши бурд.
 */
export const callNumber = async (
  gameId: string
): Promise<{ number: number | null; finished: boolean }> => {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "ACTIVE") {
    return { number: null, finished: true };
  }

  const number = pickRandomUncalled(game.calledNumbers);
  if (number === null) {
    console.log(`[game] ${gameId.slice(0, 8)}: ҳамаи 90 рақам хонда шуд`);
    return { number: null, finished: true };
  }

  const calledNumbers = [...game.calledNumbers, number];
  await prisma.game.update({
    where: { id: gameId },
    data: { currentNumber: number, calledNumbers },
  });

  getIo().emit("game:number-called", {
    gameId,
    number,
    calledNumbers,
    timestamp: new Date().toISOString(),
  });
  console.log(`[game] ${gameId.slice(0, 8)} → рақами ${number}`);

  await checkPrizesAfterNumber(gameId);
  await broadcastStats(gameId);

  return { number, finished: false };
};

export const stopAutoCaller = (gameId: string): void => {
  const timer = activeTimers.get(gameId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(gameId);
  }
};

/** Оғози даъватгари автоматӣ — ҳар autoInterval сония як рақам */
export const startAutoCaller = async (gameId: string): Promise<void> => {
  stopAutoCaller(gameId);

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "ACTIVE" || game.callerMode !== "AUTO") return;

  const tick = async () => {
    try {
      await callNumber(gameId);
    } catch (e) {
      console.error("[caller] хато:", e);
    }
    const current = await prisma.game.findUnique({ where: { id: gameId } });
    if (current && current.status === "ACTIVE" && current.callerMode === "AUTO") {
      activeTimers.set(gameId, setTimeout(tick, current.autoInterval * 1000));
    } else {
      activeTimers.delete(gameId);
    }
  };

  activeTimers.set(gameId, setTimeout(tick, game.autoInterval * 1000));
};

/** Иваз кардани режим: AUTO → оғози caller, MANUAL → қатъ */
export const setCallerMode = async (
  gameId: string,
  mode: "AUTO" | "MANUAL"
): Promise<void> => {
  await prisma.game.update({ where: { id: gameId }, data: { callerMode: mode } });
  if (mode === "AUTO") {
    await startAutoCaller(gameId);
  } else {
    stopAutoCaller(gameId);
  }
};

/** Барқарор кардани caller-ҳои фаъол пас аз рестарти сервер */
export const resumeCallers = async (): Promise<void> => {
  const active = await prisma.game.findMany({
    where: { status: "ACTIVE", callerMode: "AUTO" },
  });
  for (const g of active) {
    console.log(`[caller] барқарорсозии caller барои бози ${g.id.slice(0, 8)}`);
    await startAutoCaller(g.id);
  }
};
