import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { verifyToken } from "../utils/jwt";
import { unauthorized, forbidden } from "../utils/errors";

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw unauthorized("Токен ёфт нашуд");
    }

    const token = header.slice(7);
    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw unauthorized("Токен нодуруст ё мӯҳлаташ гузаштааст");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) throw unauthorized("Корбар ёфт нашуд");
    if (user.isBlocked) throw forbidden("Аккаунти шумо блок шудааст");

    req.user = {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      balance: Number(user.balance),
      freeTickets: user.freeTickets,
      isBlocked: user.isBlocked,
    };
    next();
  } catch (e) {
    next(e);
  }
};
