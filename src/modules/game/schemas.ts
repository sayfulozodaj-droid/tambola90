import { z } from "zod";

export const buyTicketSchema = z.object({
  gameId: z.string().uuid("gameId нодуруст аст").optional(),
  quantity: z.coerce
    .number()
    .int("Шумораи билет бояд бутун бошад")
    .min(1, "Ҳадди ақал 1 билет")
    .max(6, "Ҳадди аксар 6 билет"),
});

export const claimPrizeSchema = z.object({
  ticketId: z.string().uuid("ticketId нодуруст аст"),
  gameId: z.string().uuid("gameId нодуруст аст"),
  round: z.coerce.number().int().min(1).max(3),
});

export const gameIdParamsSchema = z.object({
  id: z.string().uuid("ID-и бози нодуруст аст"),
});
