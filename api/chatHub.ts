import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type {
  ChatMessage,
  ChatUser,
  ClientMessage,
  ServerMessage,
} from '../shared/chat.js';

const users = new Map<string, ChatUser>();
const sockets = new Map<string, WebSocket>();
const socketUsers = new Map<WebSocket, string>();
const recentMessages: ChatMessage[] = [];
const maxRecentMessages = 100;
const maxMessageLength = 800;

function normalizeNickname(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function isValidNickname(nickname: string) {
  return nickname.length >= 2 && nickname.length <= 20;
}

function createMessage(payload: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...payload,
  };
}

function rememberMessage(message: ChatMessage) {
  recentMessages.push(message);
  if (recentMessages.length > maxRecentMessages) {
    recentMessages.splice(0, recentMessages.length - maxRecentMessages);
  }
}

function safeSend(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcast(message: ServerMessage) {
  for (const socket of sockets.values()) {
    safeSend(socket, message);
  }
}

function broadcastUsers() {
  broadcast({
    type: 'users',
    users: Array.from(users.values()),
  });
}

function parseMessage(raw: WebSocket.RawData): ClientMessage | null {
  try {
    return JSON.parse(raw.toString()) as ClientMessage;
  } catch {
    return null;
  }
}

function leave(socket: WebSocket) {
  const userId = socketUsers.get(socket);
  if (!userId) {
    return;
  }

  const user = users.get(userId);
  socketUsers.delete(socket);
  sockets.delete(userId);
  users.delete(userId);

  if (user) {
    const message = createMessage({
      kind: 'system',
      text: `${user.nickname} 离开了聊天室`,
    });
    rememberMessage(message);
    broadcast({ type: 'system', message });
    broadcastUsers();
  }
}

function handleJoin(socket: WebSocket, nicknameValue: unknown) {
  const nickname = normalizeNickname(nicknameValue);
  if (!isValidNickname(nickname)) {
    safeSend(socket, {
      type: 'error',
      message: '昵称需要 2-20 个字符',
    });
    return;
  }

  leave(socket);

  const user: ChatUser = {
    id: randomUUID(),
    nickname,
    joinedAt: new Date().toISOString(),
  };

  users.set(user.id, user);
  sockets.set(user.id, socket);
  socketUsers.set(socket, user.id);

  safeSend(socket, {
    type: 'welcome',
    userId: user.id,
    nickname: user.nickname,
    users: Array.from(users.values()),
    recentMessages,
  });

  const message = createMessage({
    kind: 'system',
    text: `${nickname} 加入了聊天室`,
  });
  rememberMessage(message);
  broadcast({ type: 'system', message });
  broadcastUsers();
}

function handleChat(socket: WebSocket, textValue: unknown) {
  const userId = socketUsers.get(socket);
  const user = userId ? users.get(userId) : undefined;
  if (!user) {
    safeSend(socket, {
      type: 'error',
      message: '请先输入昵称进入聊天室',
    });
    return;
  }

  const text = String(textValue ?? '').trim();
  if (!text) {
    safeSend(socket, {
      type: 'error',
      message: '不能发送空消息',
    });
    return;
  }

  if (text.length > maxMessageLength) {
    safeSend(socket, {
      type: 'error',
      message: `消息不能超过 ${maxMessageLength} 个字符`,
    });
    return;
  }

  const message = createMessage({
    kind: 'chat',
    userId: user.id,
    nickname: user.nickname,
    text,
  });
  rememberMessage(message);
  broadcast({ type: 'chat', message });
}

export function attachChatHub(server: Server) {
  const webSocketServer = new WebSocketServer({
    server,
    path: '/ws',
  });

  webSocketServer.on('connection', (socket) => {
    socket.on('message', (raw) => {
      const message = parseMessage(raw);
      if (!message) {
        safeSend(socket, {
          type: 'error',
          message: '消息格式不正确',
        });
        return;
      }

      if (message.type === 'join') {
        handleJoin(socket, message.nickname);
        return;
      }

      if (message.type === 'chat') {
        handleChat(socket, message.text);
        return;
      }

      if (message.type === 'leave') {
        leave(socket);
      }
    });

    socket.on('close', () => leave(socket));
    socket.on('error', () => leave(socket));
  });

  return webSocketServer;
}
