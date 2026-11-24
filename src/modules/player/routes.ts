import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../utils/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { updateProfileSchema, changePasswordSchema } from "./schemas";
import {
  getProfile,
  updateProfile,
  getBalance,
  getMyTickets,
  getMyHistory,
  changePassword,
} from "./service";

const router = Router();

// GET /api/player/profile → маълумоти шахсӣ + омор
router.get(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await getProfile(req.user!.id);
    res.json({ success: true, profile });
  })
);

// PUT /api/player/profile → таҳрири маълумот (ном)
router.put(
  "/profile",
  requireAuth,
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    const user = await updateProfile(req.user!.id, req.body.name);
    res.json({ success: true, user });
  })
);

// GET /api/player/balance → тавозуни баланс
router.get(
  "/balance",
  requireAuth,
  asyncHandler(async (req, res) => {
    const balance = await getBalance(req.user!.id);
    res.json({ success: true, ...balance });
  })
);

// GET /api/player/tickets → билетҳои ман дар бозии ҷорӣ
router.get(
  "/tickets",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await getMyTickets(req.user!.id);
    res.json({ success: true, ...result });
  })
);

// GET /api/player/history → таърихи бозиҳо + омор
router.get(
  "/history",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await getMyHistory(req.user!.id);
    res.json({ success: true, ...result });
  })
);

// POST /api/player/change-password → иваз кардани парол
router.post(
  "/change-password",
  requireAuth,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    await changePassword(req.user!.id, req.body.oldPassword, req.body.newPassword);
    res.json({ success: true, message: "Парол иваз шуд" });
  })
);

export default router;
