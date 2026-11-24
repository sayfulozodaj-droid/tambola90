import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import env from "./config/env";
import { initSocket } from "./config/socket";
import { registerGameSocketHandlers } from "./modules/game/socketHandlers";
import { resumeCallers } from "./utils/caller";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./modules/auth/routes";
import playerRoutes from "./modules/player/routes";
import walletRoutes from "./modules/wallet/routes";
import gameRoutes from "./modules/game/routes";
import adminRoutes from "./modules/admin/routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(env.uploadPath)));

app.get("/health", (_req, res) => {
  res.json({ success: true, status: "ok", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/player", playerRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Endpoint ёфт нашуд" });
});
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);
registerGameSocketHandlers();

server.listen(env.port, () => {
  console.log(`Tambola90 сервер дар порти ${env.port} кор мекунад`);
  resumeCallers().catch((e) => console.error("[caller] барқарорсозӣ хато:", e));
});
