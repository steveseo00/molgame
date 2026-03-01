import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { roomManager } from "./rooms.js";

interface WSMessage {
  type: string;
  payload?: Record<string, unknown>;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    // Auto-join the global feed
    roomManager.join("global", ws);

    ws.on("message", (raw: Buffer) => {
      try {
        const msg: WSMessage = JSON.parse(raw.toString());

        switch (msg.type) {
          case "subscribe": {
            const room = msg.payload?.room as string;
            if (room) {
              roomManager.join(room, ws);
              ws.send(JSON.stringify({ type: "subscribed", payload: { room } }));
            }
            break;
          }
          case "unsubscribe": {
            const room = msg.payload?.room as string;
            if (room) {
              roomManager.leave(room, ws);
              ws.send(JSON.stringify({ type: "unsubscribed", payload: { room } }));
            }
            break;
          }
          case "ping": {
            ws.send(JSON.stringify({ type: "pong" }));
            break;
          }
        }
      } catch {
        // Ignore invalid messages
      }
    });

    ws.on("close", () => {
      roomManager.leaveAll(ws);
    });

    ws.send(JSON.stringify({ type: "connected", payload: { message: "Welcome to Agent Card Battle" } }));
  });

  return wss;
}
