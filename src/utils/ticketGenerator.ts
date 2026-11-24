/**
 * Генератори билети Тамбола 3×9:
 * - 3 сатр × 9 сутун, дар ҳар сатр маҳз 5 рақам
 * - Сутуни 1 → 1-9, Сутуни 2 → 10-19, ..., Сутуни 9 → 80-90
 * - Дар ҳар сутун 1 ё 2 рақам (ҷамъ 15 = 6×2 + 3×1)
 * - Дар дохили сутун рақамҳо аз боло ба поён афзоиш меёбанд
 */

export interface TicketNumbers {
  row1: number[];
  row2: number[];
  row3: number[];
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Диапазони рақамҳо барои сутун (0-индекс): 0 → 1..9, 8 → 80..90 */
const columnRange = (col: number): number[] => {
  const start = col * 10 + 1;
  const end = col === 8 ? 90 : col * 10 + 10;
  const nums: number[] = [];
  for (let n = start; n <= end; n++) nums.push(n);
  return nums;
};

const pick = <T,>(arr: T[], count: number): T[] => shuffle(arr).slice(0, count);

export const generateTicket = (): TicketNumbers => {
  const columns = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  // 3 сутуни "якка" — ҳар кадом ба як сатр
  const singleCols = pick(columns, 3);
  const doubleCols = columns.filter((c) => !singleCols.includes(c));

  // Ҳар сатр бояд маҳз 4 хонаи дукарата гирад → ҷуфтҳо: (0,1)×2, (0,2)×2, (1,2)×2
  const pairTypes = shuffle([
    [0, 1],
    [0, 1],
    [0, 2],
    [0, 2],
    [1, 2],
    [1, 2],
  ]);

  const grid: (number | null)[][] = [
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
  ];

  // Сутунҳои якка: сатри якум → сутуни якуми якка ва ғ.
  singleCols.forEach((col, i) => {
    const num = pick(columnRange(col), 1)[0];
    grid[i][col] = num;
  });

  // Сутунҳои дукарата
  doubleCols.forEach((col, i) => {
    const rows = pairTypes[i];
    const nums = pick(columnRange(col), 2).sort((a, b) => a - b);
    const [rLower, rHigher] = [...rows].sort((a, b) => a - b);
    grid[rLower][col] = nums[0];
    grid[rHigher][col] = nums[1];
  });

  const toRow = (row: (number | null)[]): number[] =>
    row.filter((n): n is number => n !== null);

  return {
    row1: toRow(grid[0]),
    row2: toRow(grid[1]),
    row3: toRow(grid[2]),
  };
};

/** Рақами ҳар рақам ба кадом сутун тааллуқ дорад (0-индекс) */
export const numberToColumn = (n: number): number => Math.floor((n - 1) / 10);

/** Тафтиши дурустии билет (барои тестҳо) */
export const validateTicket = (t: TicketNumbers): boolean => {
  const rows = [t.row1, t.row2, t.row3];
  if (rows.some((r) => r.length !== 5)) return false;

  const all = rows.flat();
  if (new Set(all).size !== 15) return false;

  for (let col = 0; col < 9; col++) {
    const count = all.filter((n) => numberToColumn(n) === col).length;
    if (count < 1 || count > 2) return false;
  }
  return true;
};
