import { getIo } from "../../config/socket";
import { TokenPayload } from "../../utils/jwt";
import { callNumber } from "../../utils/caller";

/**
 * Эвентҳои Client → Server. Танҳо Admin ҳуқуқи идораи бозиро дорад.
 */
export const registerGameSocketHandlers = (): void => {
  const io = getIo();

  io.on("connection", (socket) => {
    // 'admin:call-number' → { gameId } (дастӣ)
    socket.on("admin:call-number", async (data: { gameId: string }) => {
      const user = socket.data.user as TokenPayload;
      if (user?.role !== "ADMIN") return;
      if (!data?.gameId) return;
      try {
        await callNumber(data.gameId);
      } catch (e) {
        console.error("[socket] admin:call-number хато:", e);
      }
    });
  });
};
