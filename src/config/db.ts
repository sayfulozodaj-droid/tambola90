import { Prisma, PrismaClient } from "@prisma/client";

// ── Пайвасти устувор ─────────────────────────────────────────────
// Дар шабақаҳои сусттакрор (ё ҳангоми бедор шудани Neon) баъзан
// хатогии муваққатии пайваст ба амал меояд: P1001 / P1002 / P1017 / P2024.
// Чунин дархостҳо ба сервер нарасидаанд, бинобар ин такрор кардан бехатар аст.
const RETRYABLE = new Set(["P1001", "P1002", "P1017", "P2024"]);
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const base = new PrismaClient();

export const prisma = base.$extends({
  name: "retry-connection-errors",
  query: {
    async $allOperations({ args, query }) {
      let attempt = 0;
      for (;;) {
        try {
          return await query(args);
        } catch (err) {
          const code =
            err instanceof Prisma.PrismaClientKnownRequestError ? err.code : undefined;
          if (!code || !RETRYABLE.has(code) || attempt >= MAX_RETRIES) throw err;
          await sleep(250 * 2 ** attempt); // 250ms → 500ms → 1000ms
          attempt += 1;
        }
      }
    },
  },
});
