import multer from "multer";
import path from "path";
import fs from "fs";
import env from "../config/env";
import { badRequest } from "../utils/errors";

const ALLOWED = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

if (!fs.existsSync(env.uploadPath)) {
  fs.mkdirSync(env.uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadPath),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `check_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

export const uploadCheckImage = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.includes(ext)) {
      cb(new Error("FORMAT"));
      return;
    }
    cb(null, true);
  },
});
