import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../utils/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { buyTicketSchema, claimPrizeSchema, gameIdParamsSchema } from "./schemas";
import {
  getCurrentGame,
  getLobby,
  buyTicket,
  claimPrize,
  getLeaderboard,
} from "./service";

const router = Router();

// GET /api/game/current → бозии ҷорӣ (live) — барои ҳама дастрас (меҳмон ҳам)
router.get(
  "/current",
  asyncHandler(async (_req, res) => {
    const game = await getCurrentGame();
    res.json({ success: true, game });
  })
);

// GET /api/game/lobby → бозии ояндадор + таърих (барои бозингар)
router.get(
  "/lobby",
  requireAuth,
  asyncHandler(async (req, res) => {
    const lobby = await getLobby(req.user!.id);
    res.json({ success: true, ...lobby });
  })
);

// POST /api/game/buy-ticket → харидани билет (1–6 дона)
router.post(
  "/buy-ticket",
  requireAuth,
  validate({ body: buyTicketSchema }),
  asyncHandler(async (req, res) => {
    const { gameId, quantity } = req.body;
    const result = await buyTicket(req.user!.id, gameId, quantity);
    res.json({ success: true, ...result });
  })
);

// POST /api/game/claim-prize → тасдиқи бурд дар муддати 30 сония
router.post(
  "/claim-prize",
  requireAuth,
  validate({ body: claimPrizeSchema }),
  asyncHandler(async (req, res) => {
    const { ticketId, gameId, round } = req.body;
    const result = await claimPrize(req.user!.id, ticketId, gameId, round);
    res.json({ success: true, ...result });
  })
);

// GET /api/game/:id/leaderboard → рейтинг ва наздикони бурд
router.get(
  "/:id/leaderboard",
  validate({ params: gameIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const leaderboard = await getLeaderboard(req.params.id);
    res.json({ success: true, ...leaderboard });
  })
);

export default router;
