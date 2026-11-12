export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Приемаме WebSocket връзката (Hibernation API)
    this.state.acceptWebSocket(server);

    // Изпращаме историята към новия клиент
    const history = (await this.state.storage.get('history')) || [];
    server.send(JSON.stringify({ type: 'history', messages: history }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    if (data.type === 'join') {
      ws.serializeAttachment({ name: data.name });
      this.broadcast({ type: 'system', text: `${data.name} влезе в чата` });
      return;
    }

    if (data.type === 'message') {
      const msg = {
        sender: data.sender || 'Анонимен',
        text: String(data.text).slice(0, 500),
        ts: Date.now()
      };

      // Записваме в трайното хранилище (пази последните 200)
      let history = (await this.state.storage.get('history')) || [];
      history.push(msg);
      if (history.length > 200) history = history.slice(-200);
      await this.state.storage.put('history', history);

      this.broadcast({ type: 'message', ...msg });
    }
  }

  async webSocketClose(ws) {
    const att = ws.deserializeAttachment();
    if (att?.name) {
      this.broadcast({ type: 'system', text: `${att.name} излезе от чата` });
    }
  }

  async webSocketError(ws) {
    // връзката просто се затваря
  }

  broadcast(obj) {
    const str = JSON.stringify(obj);
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(str);
      } catch {
        // игнорираме мъртви връзки
      }
    }
  }
}