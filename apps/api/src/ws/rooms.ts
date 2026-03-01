import type { WebSocket } from "ws";

class RoomManager {
  private rooms = new Map<string, Set<WebSocket>>();

  join(room: string, ws: WebSocket) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(ws);
  }

  leave(room: string, ws: WebSocket) {
    this.rooms.get(room)?.delete(ws);
    if (this.rooms.get(room)?.size === 0) {
      this.rooms.delete(room);
    }
  }

  leaveAll(ws: WebSocket) {
    for (const [room, clients] of this.rooms) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.rooms.delete(room);
      }
    }
  }

  broadcast(room: string, data: unknown, exclude?: WebSocket) {
    const clients = this.rooms.get(room);
    if (!clients) return;

    const message = JSON.stringify(data);
    for (const client of clients) {
      if (client !== exclude && client.readyState === 1) {
        client.send(message);
      }
    }
  }

  broadcastAll(data: unknown) {
    const message = JSON.stringify(data);
    for (const clients of this.rooms.values()) {
      for (const client of clients) {
        if (client.readyState === 1) {
          client.send(message);
        }
      }
    }
  }

  getRoomSize(room: string): number {
    return this.rooms.get(room)?.size ?? 0;
  }
}

export const roomManager = new RoomManager();
