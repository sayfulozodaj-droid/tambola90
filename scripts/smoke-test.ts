/**
 * Smoke-testи мантиқи бозӣ (бе базаи маълумот лозим нест):
 * - генератсияи билет 3×9 (қоидаҳои тамбола 90)
 * - ҳисоби ҷоизаҳо (round1 = билети ройгон, round2 = 50%, round3 = 100%, комиссия 10%)
 * - санҷиши сатри пуршуда (findCompletedRows / isRowComplete)
 * - равозанаи claim = 30 сония
 *
 * Иҷро: npx tsx scripts/smoke-test.ts
 */
import {
  generateTicket,
  validateTicket,
} from "../src/utils/ticketGenerator";
import {
  computePrize,
  findCompletedRows,
  isRowComplete,
  CLAIM_WINDOW_MS,
} from "../src/utils/prizeCalculator";

let failed = 0;
const check = (cond: boolean, msg: string) => {
  if (!cond) {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
};

// --- 1) Генератсияи 5000 билет ---
const N = 50000;
let ok = 0;
for (let i = 0; i < N; i++) {
  const t = generateTicket();
  if (!validateTicket(t)) {
    console.error("Билети нодуруст:", JSON.stringify(t));
    break;
  }
  ok++;
}
check(ok === N, `билетҳо: ${ok}/${N} дуруст буданд`);
console.log(`[1] Генератсияи билет: ${ok}/${N} дуруст`);

// --- 2) Ҳисоби ҷоизаҳо ---
const p1 = computePrize(1000, 1);
check(
  p1.prizeAmount === 0 && p1.commission === 0 && p1.netAmount === 0,
  `round 1 → 0 (билети ройгон): ${JSON.stringify(p1)}`
);
const p2 = computePrize(1000, 2);
check(
  p2.prizeAmount === 500 && p2.commission === 50 && p2.netAmount === 450,
  `round 2 → 50% − комиссия 10%: ${JSON.stringify(p2)}`
);
const p3 = computePrize(1000, 3);
check(
  p3.prizeAmount === 1000 && p3.commission === 100 && p3.netAmount === 900,
  `round 3 → 100% − комиссия 10%: ${JSON.stringify(p3)}`
);
const p2b = computePrize(123.45, 2);
check(
  p2b.prizeAmount === 61.73 &&
    p2b.commission === 6.17 &&
    p2b.netAmount === 55.56,
  `fund=123.45, round 2 → 61.73/6.17/55.56: ${JSON.stringify(p2b)}`
);
console.log("[2] Ҳисоби ҷоизаҳо: текстони баландӣ гузаштанд");

// --- 3) Санҷиши сатри пуршуда ---
const t = {
  row1: [3, 22, 41, 66, 88],
  row2: [1, 10, 30, 50, 90],
  row3: [5, 15, 35, 55, 75],
};
const called = new Set([3, 22, 41, 66]); // 88 ҳанӯз нест
check(!isRowComplete(t.row1, called), "сатр пур нашудааст (88 нест)");
check(findCompletedRows(t, called, { row1: false, row2: false, row3: false }).length === 0, "сатри пур нашуда ба рӯйхат ворид намешавад");
called.add(88);
check(isRowComplete(t.row1, called), "сатр пур шуд (5/5)");
check(
  findCompletedRows(t, called, { row1: false, row2: false, row3: false }).includes(0),
  "findCompletedRows сатри пуро меёбад"
);
check(
  findCompletedRows(t, called, { row1: true, row2: false, row3: false }).length === 0,
  "сатри аллакай дарёфтшуда такрор намешавад"
);
console.log("[3] Санҷиши сатрҳо: текстони баландӣ гузаштанд");

// --- 4) Равозанаи claim ---
check(CLAIM_WINDOW_MS === 30_000, `CLAIM_WINDOW_MS = ${CLAIM_WINDOW_MS} ms (барои 30 сония)`);
console.log("[4] Равозанаи claim: 30 сония");

console.log(
  failed === 0
    ? `\n✅ Ҳамаи санҷишҳо гузаштанд (${N.toLocaleString()} билет + ҷоизаҳо + сатрҳо)`
    : `\n❌ ${failed} санҷиш гузашт накард`
);
process.exit(failed === 0 ? 0 : 1);