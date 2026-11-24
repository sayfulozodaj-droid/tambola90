// E2E: тамоми ҷараёни корӣ — админ бозӣ месозад, бозингар қайд мешавад,
// депозит мекунад, админ тасдиқ мекунад, билет мехарад, бозӣ оғоз/рақам/анҷом.
const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0;
let fail = 0;

function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}${extra ? " — " + extra : ""}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${extra ? " — " + extra : ""}`);
  }
}

async function req(method, path, { token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = "Bearer " + token;
  let body;
  if (json) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const r = await fetch(BASE + path, { method, headers, body });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}

// 1x1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64"
);

(async () => {
  console.log("\n=== 1. Вуруди админ");
  const adminLogin = await req("POST", "/api/auth/login", {
    json: { phone: "900000000", password: "admin123" },
  });
  ok("login admin", adminLogin.status === 200 && adminLogin.data.user?.role === "ADMIN");
  const admin = adminLogin.data.token;

  console.log("\n=== 2. Сохтани бозӣ");
  const create = await req("POST", "/api/admin/game/create", {
    token: admin,
    json: { ticketPrice: 10, autoInterval: 5 },
  });
  ok("create game", (create.status === 200 || create.status === 201) && !!create.data.game?.id, `status=${create.data.game?.status}`);
  const gameId = create.data.game?.id;

  console.log("\n=== 3. Қайдгирии бозингари нав");
  const phone = "9" + String(Date.now()).slice(-8);
  const reg = await req("POST", "/api/auth/register", {
    json: { name: "Тест Бозингар", phone, password: "test123" },
  });
  ok("register", reg.status === 200 && !!reg.data.registerToken, `devCode=${reg.data.devCode}`);

  const verify = await req("POST", "/api/auth/verify-otp", {
    json: { phone, code: reg.data.devCode, registerToken: reg.data.registerToken },
  });
  ok("verify-otp", verify.status === 200 && !!verify.data.token);
  const player = verify.data.token;

  console.log("\n=== 4. Депозит (multipart + расм)");
  const form = new FormData();
  form.append("amount", "100");
  form.append("checkImage", new Blob([PNG], { type: "image/png" }), "check.png");
  const dep = await req("POST", "/api/wallet/deposit", { token: player, form });
  ok("deposit created", dep.status === 201 && !!dep.data.transaction?.id, `status=${dep.data.transaction?.status}`);
  const depositId = dep.data.transaction?.id;

  console.log("\n=== 5. Тасдиқи депозит аз ҷониби админ");
  const pending = await req("GET", "/api/admin/deposits?status=PENDING", { token: admin });
  ok("pending list", pending.status === 200 && pending.data.deposits?.some((d) => d.id === depositId));

  const confirm = await req("POST", `/api/admin/deposits/${depositId}/confirm`, {
    token: admin,
    json: { amount: 100 },
  });
  ok("confirm deposit", confirm.status === 200 && confirm.data.deposit?.status === "CONFIRMED");

  const bal1 = await req("GET", "/api/player/balance", { token: player });
  ok("balance = 100", bal1.data.balance === 100, `balance=${bal1.data.balance}`);

  console.log("\n=== 6. Харидани 2 билет");
  const buy = await req("POST", "/api/game/buy-ticket", {
    token: player,
    json: { gameId, quantity: 2 },
  });
  if (buy.status !== 200) console.log("     buy-ticket:", buy.status, JSON.stringify(buy.data).slice(0, 300));
  ok("buy tickets", buy.status === 200, `cost=${buy.data.cost ?? "-"} balance=${buy.data.balance ?? "-"}`);

  const myTickets = await req("GET", "/api/player/tickets", { token: player });
  const tickets = myTickets.data.tickets || [];
  ok("билетҳо дар профил", tickets.length === 2, `count=${tickets.length}`);

  const bal2 = await req("GET", "/api/player/balance", { token: player });
  ok("balance = 80 (2×10)", bal2.data.balance === 80, `balance=${bal2.data.balance}`);

  console.log("\n=== 7. Оғози бозӣ");
  const start = await req("POST", "/api/admin/game/start", { token: admin, json: { gameId } });
  ok("start game", start.status === 200 && start.data.game?.status === "ACTIVE");

  console.log("\n=== 8. Хондани рақамҳо (дастӣ)");
  const numbers = [];
  for (let i = 0; i < 5; i++) {
    const c = await req("POST", "/api/admin/game/call-number", { token: admin, json: { gameId } });
    if (c.status === 200 && c.data.number) numbers.push(c.data.number);
    else console.log("     call-number:", c.status, JSON.stringify(c.data).slice(0, 120));
  }
  ok("5 рақами ягона хонда шуд", numbers.length === 5 && new Set(numbers).size === 5, numbers.join(", "));

  const cur = await req("GET", "/api/game/current");
  ok(
    "game/current ҳолати дуруст",
    cur.status === 200 && (cur.data.game?.calledNumbers?.length ?? 0) >= 5 && cur.data.game?.status === "ACTIVE",
    `called=${cur.data.game?.calledNumbers?.length}`
  );

  console.log("\n=== 9. Claim бе сатр → бояд рад шавад");
  const ticketId = tickets[0]?.id;
  if (!ticketId) {
    console.log("  ⏭  гузашт — билет нест");
  } else {
    const claim = await req("POST", "/api/game/claim-prize", {
      token: player,
      json: { ticketId, gameId, round: 1 },
    });
    ok("claim бе сатр рад шуд", claim.status >= 400, `${claim.status} ${String(claim.data?.message || "").slice(0, 60)}`);
  }

  console.log("\n=== 10. Анҷоми бозӣ");
  const finish = await req("POST", "/api/admin/game/finish", { token: admin, json: { gameId } });
  ok("finish game", finish.status === 200 && finish.data.game?.status === "FINISHED");

  console.log("\n=== 11. Омор ва таърих");
  const stats = await req("GET", "/api/admin/stats", { token: admin });
  ok("admin stats", stats.status === 200 && !!stats.data.stats?.income);
  const hist = await req("GET", "/api/player/history", { token: player });
  ok("player history", hist.status === 200 && Array.isArray(hist.data.games));
  const prof = await req("GET", "/api/player/profile", { token: player });
  ok("player profile", prof.status === 200 && prof.data.profile?.phone === phone);

  console.log("\n=== 12. Блок кардани бозингар");
  const players = await req("GET", `/api/admin/players?search=${phone}`, { token: admin });
  const target = players.data.players?.[0];
  ok("player дар рӯйхат ёфт шуд", !!target);
  if (target) {
    const block = await req("POST", `/api/admin/players/${target.id}/block`, { token: admin });
    ok("block", block.status === 200);
    const blockedReq = await req("GET", "/api/player/profile", { token: player });
    ok("корбари блокшуда 403 мегирад", blockedReq.status === 403, `status=${blockedReq.status}`);
    const unblock = await req("POST", `/api/admin/players/${target.id}/unblock`, { token: admin });
    ok("unblock", unblock.status === 200);
  }

  console.log(`\n──────────────\nНатиҷа: ${pass} гузашт, ${fail} хато`);
  if (fail > 0) process.exitCode = 1;
})();
