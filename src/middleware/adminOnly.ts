import { Request, Response, NextFunction } from "express";
import { forbidden } from "../utils/errors";

export const adminOnly = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== "ADMIN") {
    next(forbidden("Танҳо барои админ дастрас аст"));
    return;
  }
  next();
};
