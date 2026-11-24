/**
 * Ҳисобкунии ҷоизаҳо:
 * - Сатри 1 → билети ройгон (0 сомонӣ)
 * - Сатри 2 → 50% аз totalFund (ҳар бурд — 50%, Вариант В)
 * - Сатри 3 → 100% аз totalFund (ҳар бурд — 100%, Вариант В)
 * - Комиссияи барнома аз ҳар ҷоиза — 10%
 */

import { TicketNumbers } from "./ticketGenerator";

/** Равзанаи тасдиқи бурд — 30 сония */
export const CLAIM_WINDOW_MS = 30_000;

export const getRows = (numbers: TicketNumbers): number[][] => [
  numbers.row1,
  numbers.row2,
  numbers.row3,
];

export const isRowComplete = (row: number[], called: Set<number>): boolean =>
  row.length > 0 && row.every((n) => called.has(n));

/** Кадом сатрҳо пас аз рақами нав пур шудаанд */
export const findCompletedRows = (
  numbers: TicketNumbers,
  called: Set<number>,
  done: { row1: boolean; row2: boolean; row3: boolean }
): number[] => {
  const rows = getRows(numbers);
  const doneArr = [done.row1, done.row2, done.row3];
  return [0, 1, 2].filter((i) => !doneArr[i] && isRowComplete(rows[i], called));
};

export interface PrizeBreakdown {
  prizeAmount: number;
  commission: number;
  netAmount: number;
}

/** Ҳисоби ҷоиза барои сатр (round: 1, 2 ё 3) */
export const computePrize = (totalFund: number, round: number): PrizeBreakdown => {
  if (round === 1) {
    return { prizeAmount: 0, commission: 0, netAmount: 0 };
  }
  const share = round === 2 ? 0.5 : 1;
  const prizeAmount = roundTo2(totalFund * share);
  const commission = roundTo2(prizeAmount * 0.1);
  return { prizeAmount, commission, netAmount: roundTo2(prizeAmount - commission) };
};

export const roundTo2 = (n: number): number => Math.round(n * 100) / 100;
