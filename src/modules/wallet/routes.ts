import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { uploadCheckImage } from "../../middleware/upload";
import { validate } from "../../utils/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { badRequest } from "../../utils/errors";
import { depositSchema } from "./schemas";
import { createDeposit, getMyTransactions, getActiveBankCard } from "./service";

const router = Router();

// POST /api/wallet/deposit → дархости пур кардан + расми чек
router.post(
  "/deposit",
  requireAuth,
  uploadCheckImage.single("checkImage"),
  validate({ body: depositSchema }),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("Расми чек ҳатмӣ аст");
    const checkImagePath = `/uploads/${req.file.filename}`;
    const tx = await createDeposit(req.user!.id, req.body.amount, checkImagePath);
    res.status(201).json({ success: true, transaction: tx });
  })
);

// GET /api/wallet/transactions → таърихи транзаксияҳо
router.get(
  "/transactions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const transactions = await getMyTransactions(req.user!.id);
    res.json({ success: true, transactions });
  })
);

// GET /api/wallet/bank-card → маълумоти корти бонкӣ барои пардохт
router.get(
  "/bank-card",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const card = await getActiveBankCard();
    res.json({ success: true, card });
  })
);

export default router;
