// Санҷиши зиндаи API: /health + логин + endpoint-ҳои асосӣ
const BASE = process.env.BASE || "http://localhost:3000";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(path, opts, tries = 20) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(BASE + path, opts);
      const text = await r.text();
      let body;
      try { body = JSON.parse(text); } catch { body = text; }
      return { status: r.status, body };
    } catch (e) {
      last = e;
      await sleep(500);
    }
  }
  return { status: 0, body: String(last && last.message) };
}

(async () => {
  const h = await call("/health");
  console.log("HEALTH:", h.status, JSON.stringify(h.body));

  const login = await call("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "900000000", password: "admin123" }),
  });
  console.log("LOGIN:", login.status, login.body?.user ? `role=${login.body.user.role}` : JSON.stringify(login.body));

  if (login.status !== 200) {
    process.exitCode = 1;
    return;
  }

  const token = login.body.token;
  const auth = { Authorization: "Bearer " + token, "Content-Type": "application/json" };

  const stats = await call("/api/admin/stats", { headers: auth });
  console.log("ADMIN STATS:", stats.status, JSON.stringify(stats.body).slice(0, 220));

  const game = await call("/api/game/current");
  console.log("GAME CURRENT:", game.status, JSON.stringify(game.body).slice(0, 160));

  const lobby = await call("/api/game/lobby");
  console.log("LOBBY:", lobby.status, JSON.stringify(lobby.body).slice(0, 160));

  const deposits = await call("/api/admin/deposits", { headers: auth });
  console.log("ADMIN DEPOSITS:", deposits.status, JSON.stringify(deposits.body).slice(0, 160));

  const players = await call("/api/admin/players", { headers: auth });
  console.log("ADMIN PLAYERS:", players.status, JSON.stringify(players.body).slice(0, 160));

  const profile = await call("/api/player/profile", { headers: auth });
  console.log("PLAYER PROFILE:", profile.status, JSON.stringify(profile.body).slice(0, 200));
})();
