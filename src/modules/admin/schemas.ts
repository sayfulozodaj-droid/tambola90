import { z } from "zod";

export const createGameSchema = z.object({
  ticketPrice: z.coerce.number().min(0.1, "Нархи билет бояд аз 0.1 зиёд бошад").max(100000),
  autoInterval: z.coerce.number().int().min(3, "Фосила ҳадди ақал 3 сония").max(300).default(10),
});

export const gameActionSchema = z.object({
  gameId: z.string().uuid("gameId нодуруст аст"),
});

export const callerModeSchema = z.object({
  gameId: z.string().uuid("gameId нодуруст аст"),
  mode: z.enum(["AUTO", "MANUAL"]),
});

export const confirmDepositSchema = z.object({
  amount: z.coerce.number().min(0, "Маблаг манфӣ шуда наметавонад").max(100000).optional(),
});

export const idParamsSchema = z.object({
  id: z.string().uuid("ID нодуруст аст"),
});

export const depositsQuerySchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "REJECTED"]).optional(),
});

export const playersQuerySchema = z.object({
  search: z.string().max(50).optional(),
});
