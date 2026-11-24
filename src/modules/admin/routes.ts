import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { adminOnly } from "../../middleware/adminOnly";
import { validate } from "../../utils/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { badRequest } from "../../utils/errors";
import {
  createGame,
  startGame,
  finishGame,
} from "../game/service";
import { callNumber, setCallerMode, stopAutoCaller } from "../../utils/caller";
import {
  createGameSchema,
  gameActionSchema,
  callerModeSchema,
  confirmDepositSchema,
  idParamsSchema,
  depositsQuerySchema,
  playersQuerySchema,
} from "./schemas";
import {
  listDeposits,
  confirmDeposit,
  rejectDeposit,
  listPlayers,
  setPlayerBlocked,
  getAdminStats,
} from "./service";

const router = Router();

router.use(requireAuth, adminOnly);

// ============================== Game ==============================

// POST /api/admin/game/create → сохтани бозии нав
router.post(
  "/game/create",
  validate({ body: createGameSchema }),
  asyncHandler(async (req, res) => {
    const game = await createGame(req.body.ticketPrice, req.body.autoInterval);
    res.status(201).json({ success: true, game });
  })
);

// POST /api/admin/game/start → оғоз кардани бози
router.post(
  "/game/start",
  validate({ body: gameActionSchema }),
  asyncHandler(async (req, res) => {
    const game = await startGame(req.body.gameId);
    if (game.callerMode === "AUTO") {
      await setCallerMode(req.body.gameId, "AUTO");
    }
    res.json({ success: true, game });
  })
);

// POST /api/admin/game/call-number → рақам хондан (дастӣ)
router.post(
  "/game/call-number",
  validate({ body: gameActionSchema }),
  asyncHandler(async (req, res) => {
    const { number, finished } = await callNumber(req.body.gameId);
    if (finished && number === null) {
      throw badRequest("Бози фаъол нест ё ҳамаи рақамҳо хонда шудаанд");
    }
    res.json({ success: true, number });
  })
);

// POST /api/admin/game/pause → мутаваққиф кардан (caller қатъ мешавад)
router.post(
  "/game/pause",
  validate({ body: gameActionSchema }),
  asyncHandler(async (req, res) => {
    stopAutoCaller(req.body.gameId);
    res.json({ success: true, message: "Бози мутаваққиф шуд" });
  })
);

// POST /api/admin/game/finish → хотима додан
router.post(
  "/game/finish",
  validate({ body: gameActionSchema }),
  asyncHandler(async (req, res) => {
    stopAutoCaller(req.body.gameId);
    const game = await finishGame(req.body.gameId);
    res.json({ success: true, game });
  })
);

// PUT /api/admin/game/caller-mode → иваз кардани режим (auto/manual)
router.put(
  "/game/caller-mode",
  validate({ body: callerModeSchema }),
  asyncHandler(async (req, res) => {
    await setCallerMode(req.body.gameId, req.body.mode);
    res.json({ success: true, mode: req.body.mode });
  })
);

// ============================== Finance ==============================

// GET /api/admin/deposits → рӯйхати дархостҳои пардохт
router.get(
  "/deposits",
  validate({ query: depositsQuerySchema }),
  asyncHandler(async (req, res) => {
    const status = req.query.status as "PENDING" | "CONFIRMED" | "REJECTED" | undefined;
    const deposits = await listDeposits(status);
    res.json({ success: true, deposits });
  })
);

// POST /api/admin/deposits/:id/confirm → тасдиқ (бо имкони ислоҳи маблаг)
router.post(
  "/deposits/:id/confirm",
  validate({ params: idParamsSchema, body: confirmDepositSchema }),
  asyncHandler(async (req, res) => {
    const deposit = await confirmDeposit(req.params.id, req.body.amount);
    res.json({ success: true, deposit });
  })
);

// POST /api/admin/deposits/:id/reject → рад
router.post(
  "/deposits/:id/reject",
  validate({ params: idParamsSchema }),
  asyncHandler(async (req, res) => {
    const deposit = await rejectDeposit(req.params.id);
    res.json({ success: true, deposit });
  })
);

// ============================== Players ==============================

// GET /api/admin/players → рӯйхати ҳамаи бозингарон
router.get(
  "/players",
  validate({ query: playersQuerySchema }),
  asyncHandler(async (req, res) => {
    const search = req.query.search as string | undefined;
    const players = await listPlayers(search);
    res.json({ success: true, players });
  })
);

// POST /api/admin/players/:id/block → блок
router.post(
  "/players/:id/block",
  validate({ params: idParamsSchema }),
  asyncHandler(async (req, res) => {
    const player = await setPlayerBlocked(req.params.id, true);
    res.json({ success: true, player });
  })
);

// POST /api/admin/players/:id/unblock → анблок
router.post(
  "/players/:id/unblock",
  validate({ params: idParamsSchema }),
  asyncHandler(async (req, res) => {
    const player = await setPlayerBlocked(req.params.id, false);
    res.json({ success: true, player });
  })
);

// GET /api/admin/stats → омори умумӣ
router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const stats = await getAdminStats();
    res.json({ success: true, stats });
  })
);

export default router;
