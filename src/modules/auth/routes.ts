import { Router } from "express";
import { validate } from "../../utils/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  sendOtpSchema,
  verifyOtpSchema,
  registerSchema,
  loginSchema,
  adminLoginSchema,
} from "./schemas";
import {
  sendOtp,
  register,
  verifyOtpAndCreateUser,
  login,
  adminLogin,
} from "./service";

const router = Router();

// POST /api/auth/send-otp → фиристодани OTP ба телефон
router.post(
  "/send-otp",
  validate({ body: sendOtpSchema }),
  asyncHandler(async (req, res) => {
    const { devCode } = await sendOtp(req.body.phone);
    res.json({ success: true, message: "Коди тасдиқ фиристода шуд", devCode });
  })
);

// POST /api/auth/verify-otp → тасдиқи OTP + сохтани корбар
router.post(
  "/verify-otp",
  validate({ body: verifyOtpSchema }),
  asyncHandler(async (req, res) => {
    const { phone, code, registerToken } = req.body;
    const { token, user } = await verifyOtpAndCreateUser(phone, code, registerToken);
    res.json({ success: true, token, user });
  })
);

// POST /api/auth/register → қайдгирии корбар (OTP фиристода мешавад)
router.post(
  "/register",
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const { name, phone, password } = req.body;
    const { registerToken, devCode } = await register(name, phone, password);
    res.json({ success: true, message: "Коди тасдиқ фиристода шуд", registerToken, devCode });
  })
);

// POST /api/auth/login → вуруд (телефон + парол)
router.post(
  "/login",
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { token, user } = await login(req.body.phone, req.body.password);
    res.json({ success: true, token, user });
  })
);

// POST /api/auth/admin/login → вуруди админ
router.post(
  "/admin/login",
  validate({ body: adminLoginSchema }),
  asyncHandler(async (req, res) => {
    const { token, user } = await adminLogin(req.body.phone, req.body.password);
    res.json({ success: true, token, user });
  })
);

export default router;
