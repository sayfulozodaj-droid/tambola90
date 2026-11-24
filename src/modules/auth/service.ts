import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "@prisma/client";
import { prisma } from "../../config/db";
import env from "../../config/env";
import { signToken } from "../../utils/jwt";
import { smsSender } from "../../utils/sms";
import { badRequest, conflict, forbidden, unauthorized } from "../../utils/errors";

export interface PublicUser {
  id: string;
  phone: string;
  name: string;
  role: string;
  balance: number;
  freeTickets: number;
}

export const toPublicUser = (u: User): PublicUser => ({
  id: u.id,
  phone: u.phone,
  name: u.name,
  role: u.role,
  balance: Number(u.balance),
  freeTickets: u.freeTickets,
});

const OTP_TTL_MS = 5 * 60 * 1000;

export const sendOtp = async (phone: string): Promise<{ devCode?: string }> => {
  const code = String(Math.floor(100000 + Math.random() * 900000));

  // Кодҳои пешинаи истифоданашуда беэътибор мешаванд
  await prisma.otpCode.updateMany({
    where: { phone, used: false },
    data: { used: true },
  });
  await prisma.otpCode.create({
    data: { phone, code, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });

  await smsSender.send(phone, `Tambola90: коди тасдиқ — ${code}`);

  // Дар режими stub кодро бармегардонем, то дар dev санҷиш мумкин бошад
  return env.smsProvider === "stub" ? { devCode: code } : {};
};

const consumeOtp = async (phone: string, code: string): Promise<void> => {
  const otp = await prisma.otpCode.findFirst({
    where: { phone, code, used: false, expiresAt: { gt: new Date() } },
  });
  if (!otp) throw badRequest("Коди тасдиқ нодуруст ё мӯҳлаташ гузаштааст");
  await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });
};

interface RegisterTokenPayload {
  purpose: "register";
  name: string;
  phone: string;
  passwordHash: string;
}

export const register = async (
  name: string,
  phone: string,
  password: string
): Promise<{ registerToken: string; devCode?: string }> => {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw conflict("Ин рақами телефон аллакай сабт шудааст");

  const passwordHash = await bcrypt.hash(password, 10);
  const registerToken = jwt.sign(
    { purpose: "register", name, phone, passwordHash } satisfies RegisterTokenPayload,
    env.jwtSecret,
    { expiresIn: "10m" }
  );

  const { devCode } = await sendOtp(phone);
  return { registerToken, devCode };
};

export const verifyOtpAndCreateUser = async (
  phone: string,
  code: string,
  registerToken: string
): Promise<{ token: string; user: PublicUser }> => {
  let payload: RegisterTokenPayload;
  try {
    payload = jwt.verify(registerToken, env.jwtSecret) as RegisterTokenPayload;
  } catch {
    throw badRequest("Регистратсия мӯҳлаташ гузаштааст — аз нав қайд шавед");
  }

  if (payload.purpose !== "register" || payload.phone !== phone) {
    throw badRequest("Маълумоти регистратсия нодуруст аст");
  }

  await consumeOtp(phone, code);

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw conflict("Ин рақами телефон аллакай сабт шудааст");

  const user = await prisma.user.create({
    data: { phone, name: payload.name, password: payload.passwordHash },
  });

  return { token: signToken({ id: user.id, role: user.role }), user: toPublicUser(user) };
};

export const login = async (
  phone: string,
  password: string
): Promise<{ token: string; user: PublicUser }> => {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw unauthorized("Телефон ё парол нодуруст аст");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw unauthorized("Телефон ё парол нодуруст аст");

  if (user.isBlocked) throw forbidden("Аккаунти шумо блок шудааст");

  return { token: signToken({ id: user.id, role: user.role }), user: toPublicUser(user) };
};

export const adminLogin = async (
  phone: string,
  password: string
): Promise<{ token: string; user: PublicUser }> => {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw unauthorized("Телефон ё парол нодуруст аст");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw unauthorized("Телефон ё парол нодуруст аст");

  if (user.role !== "ADMIN") throw forbidden("Ин аккаунт админ нест");
  if (user.isBlocked) throw forbidden("Аккаунти шумо блок шудааст");

  return { token: signToken({ id: user.id, role: user.role }), user: toPublicUser(user) };
};
