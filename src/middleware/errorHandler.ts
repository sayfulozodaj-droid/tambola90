import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { ApiError } from "../utils/errors";

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ success: false, message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    const first = err.errors[0];
    res.status(400).json({
      success: false,
      message: first ? `${first.path.join(".")}: ${first.message}` : "Маълумоти нодуруст",
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ success: false, message: "Ҳаҷми файл аз 5MB зиёд аст" });
      return;
    }
    res.status(400).json({ success: false, message: `Хатои боркунии файл: ${err.code}` });
    return;
  }

  if (err instanceof Error && err.message === "FORMAT") {
    res.status(400).json({ success: false, message: "Танҳо jpg/png/webp иҷозат аст" });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ success: false, message: "Чунин сабт аллакай мавҷуд аст" });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ success: false, message: "Сабт ёфт нашуд" });
      return;
    }
    if (err.code === "P2003") {
      res.status(400).json({ success: false, message: "Пайванди нодуруст дар маълумот" });
      return;
    }
  }

  console.error("[error]", err);
  res.status(500).json({ success: false, message: "Хатои дохилии сервер" });
};
