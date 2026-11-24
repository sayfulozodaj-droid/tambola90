// Санҷиши устувории пайвастшавӣ ба DB: 30 дархости пай дар пай + 10 батчи параллелӣ
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient(
  process.argv[2]
    ? { datasources: { db: { url: process.env.DATABASE_URL + "&" + process.argv[2] } } }
    : undefined
);

const mask = (u) => String(u).replace(/:\/\/[^@]*@/, "://***@");

(async () => {
  console.log("URL:", mask(process.env.DATABASE_URL));

  let okSeq = 0;
  const seqErr = {};
  for (let i = 0; i < 30; i++) {
    try {
      await prisma.user.count();
      okSeq++;
    } catch (e) {
      seqErr[e.code || "?"] = (seqErr[e.code || "?"] || 0) + 1;
    }
  }
  console.log(`SEQ: ${okSeq}/30 ok`, Object.keys(seqErr).length ? seqErr : "");

  let okPar = 0;
  const parErr = {};
  for (let b = 0; b < 10; b++) {
    const rs = await Promise.allSettled([
      prisma.transaction.aggregate({ _sum: { amount: true } }),
      prisma.prizeLog.aggregate({ _sum: { commission: true } }),
      prisma.game.findFirst(),
      prisma.ticket.count(),
      prisma.user.count(),
      prisma.bankCard.count(),
    ]);
    for (const r of rs) {
      if (r.status === "fulfilled") okPar++;
      else {
        const c = (r.reason && r.reason.code) || "?";
        parErr[c] = (parErr[c] || 0) + 1;
      }
    }
  }
  console.log(`PAR: ${okPar}/60 ok`, Object.keys(parErr).length ? parErr : "");

  await prisma.$disconnect();
})();
