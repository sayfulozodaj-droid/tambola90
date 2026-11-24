import http from "http";
import { Server, Socket } from "socket.io";
import env from "./env";
import { verifyToken, TokenPayload } from "../utils/jwt";

let io: Server | null = null;

export const initSocket = (server: http.Server): Server => {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  // Аутентификатсия: токен дар handshake.auth.token
  io.use((socket: Socket, next) => {
    try {
      const token = (socket.handshake.auth?.token as string) ?? "";
      if (!token) throw new Error("no token");
      const payload: TokenPayload = verifyToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as TokenPayload;
    console.log(`[socket] пайваст: ${user.id} (${user.role})`);
    // Хонаи шахсии корбар — барои ирсоли эвентҳои шахсӣ (prize-available)
    socket.join(`user:${user.id}`);
    if (user.role === "ADMIN") {
      socket.join("admins");
    }
    socket.on("disconnect", () => {
      console.log(`[socket] қатъ: ${user.id}`);
    });
  });

  return io;
};

export const getIo = (): Server => {
  if (!io) throw new Error("Socket.io ҳанӯз init нашудааст");
  return io;
};
