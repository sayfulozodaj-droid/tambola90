# Tambola90 — Backend Server

Сервери бозии Tambola90: Node.js + Express + PostgreSQL + Prisma + Socket.io.
Бозии онлайни казино дар асоси рақамҳои 1–90 бо билетҳои 3×9.

## Оғози кор

```bash
# 1. Вобастагиҳо
npm install

# 2. Танзимот
cp .env.example .env
# .env → DATABASE_URL-и PostgreSQL-и худро гузоред (локалӣ ё Neon/Supabase/Railway)

# 3. Мигратсияи база + админи аввала
npx prisma migrate dev --name init
npx prisma db seed

# 4. Иҷро (dev)
npm run dev
# ё production:
npm run build && npm start
```

Сервер дар порти `3000` (тағйир дар `.env`).

## Админи аввала (seed)

- Телефон: `900000000`
- Парол: `admin123`
- **Пас аз вуруди аввал паролро иваз кунед!**

Корти бонкии намуна низ дар seed сохта мешавад — дар база иваз кунед.

## SMS / OTP

- Бе `SMS_API_KEY` сервер дар режими **stub** кор мекунад: код ба консол чоп мешавад ва дар ҷавоби API ҳамчун `devCode` бармегардад (танҳо барои dev).
- Барои Eskiz.uz: `.env` → `SMS_PROVIDER=eskiz`, `SMS_API_KEY=...`

## API — мухтасар

| Гурӯҳ | Endpoint |
|---|---|
| Auth | `POST /api/auth/send-otp`, `/verify-otp`, `/register`, `/login`, `/admin/login` |
| Player | `GET/PUT /api/player/profile`, `GET /balance`, `GET /tickets`, `GET /history`, `POST /change-password` |
| Wallet | `POST /api/wallet/deposit` (multipart: `amount` + `checkImage`), `GET /transactions`, `GET /bank-card` |
| Game | `GET /api/game/current`, `GET /lobby`, `POST /buy-ticket`, `POST /claim-prize`, `GET /:id/leaderboard` |
| Admin | `POST /admin/game/create|start|call-number|pause|finish`, `PUT /admin/game/caller-mode`, `GET /admin/deposits`, `POST /admin/deposits/:id/confirm|reject`, `GET /admin/players`, `POST /admin/players/:id/block|unblock`, `GET /admin/stats` |

## Socket.io — эвентҳо

Пайваст: `io(url, { auth: { token } })`

Server → Client:
- `game:number-called` → `{ gameId, number, calledNumbers, timestamp }`
- `game:prize-available` → `{ prizeLogId, ticketId, gameId, round, amount, description, expiresIn: 30 }` (танҳо ба ғолиб)
- `game:prize-expired` → `{ ticketId, round }` (танҳо ба ғолиб)
- `game:prize-won` → `{ ticketId, userId, round, amount }` (ба ҳама)
- `game:status-changed` → `{ gameId, status }`
- `game:stats-updated` → `{ gameId, totalFund, activeTickets, activePlayers }`
- `admin:new-deposit` / `admin:deposit-updated` (танҳо админҳо)

Client → Server (танҳо Admin):
- `admin:call-number` → `{ gameId }`

## Логикаи бози

- **Билет:** 3 сатр × 9 сутун, 5 рақам дар сатр, 1–2 рақам дар сутун (сутунҳо мувофиқи диапазони 1-9...80-90).
- **Сатри 1** пур шуд → билети ройгон (тавассути claim).
- **Сатри 2** → 50% аз фонд (ҳар ғолиб 50%), **Сатри 3** → 100% (ҳар ғолиб 100%).
- **Claim:** ғолиб 30 сония вақт дорад (`POST /api/game/claim-prize`), вагарна ҷоиза EXPIRED мешавад.
- **Комиссия:** 10% аз ҳар ҷоиза; 10% аз ҳар хариди билет.
- **Carry-over:** фонди тақсимнашуда ба бозии навбатӣ мегузарад.

## Санҷишҳо

```bash
npm run typecheck        # санҷиши намудҳо
npx prisma validate      # санҷиши схема
```
