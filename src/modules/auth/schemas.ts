import { z } from "zod";

const phoneSchema = z
  .string()
  .regex(/^\d{9,12}$/, "Рақами телефон бояд 9–12 рақам бошад");

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "Код бояд 6 рақам бошад"),
  registerToken: z.string().min(10, "registerToken лозим аст"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Ном бояд ҳадди ақал 2 ҳарф бошад").max(50),
  phone: phoneSchema,
  password: z.string().min(6, "Парол бояд ҳадди ақал 6 рамз бошад").max(100),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Парол лозим аст"),
});

export const adminLoginSchema = loginSchema;
