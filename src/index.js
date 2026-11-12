import { ChatRoom } from './chatroom.js';
export { ChatRoom };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // WebSocket към стая: /room/{име}
    const match = url.pathname.match(/^\/room\/([^/]+)$/);
    if (match) {
      const roomName = decodeURIComponent(match[1]).toLowerCase();
      const id = env.CHAT_ROOM.idFromName(roomName);
      const stub = env.CHAT_ROOM.get(id);
      return stub.fetch(request);
    }

    // Всичко останало – статични файлове от public/
    return env.ASSETS.fetch(request);
  }
};