import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type {
  ChatMessage,
  ChatUser,
  ClientMessage,
  ServerMessage,
} from '../shared/chat.js';

type RoomState = {
  users: Map<string, ChatUser>;
  sockets: Map<string, WebSocket>;
  recentMessages: ChatMessage[];
};

type SocketSession = {
  roomId: string;
  userId: string;
};

const rooms = new Map<string, RoomState>();
const socketSessions = new Map<WebSocket, SocketSession>();
const maxRecentMessages = 100;
const maxMessageLength = 800;
const maxRoomIdLength = 32;

function normalizeNickname(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeRoomId(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, '-');
}

function isValidNickname(nickname: string) {
  return nickname.length >= 2 && nickname.length <= 20;
}

function isValidRoomId(roomId: string) {
  return roomId.length >= 2 && roomId.length <= maxRoomIdLength;
}

function getRoom(roomId: string): RoomState {
  const existingRoom = rooms.get(roomId);
  if (existingRoom) {
    return existingRoom;
  }

  const room = {
    users: new Map<string, ChatUser>(),
    sockets: new Map<string, WebSocket>(),
    recentMessages: [],
  };
  rooms.set(roomId, room);
  return room;
}

function cleanupRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (room && room.users.size === 0 && room.recentMessages.length === 0) {
    rooms.delete(roomId);
  }
}

function createMessage(payload: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...payload,
  };
}

function rememberMessage(room: RoomState, message: ChatMessage) {
  room.recentMessages.push(message);
  if (room.recentMessages.length > maxRecentMessages) {
    room.recentMessages.splice(0, room.recentMessages.length - maxRecentMessages);
  }
}

function safeSend(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcast(room: RoomState, message: ServerMessage) {
  for (const socket of room.sockets.values()) {
    safeSend(socket, message);
  }
}

function broadcastUsers(room: RoomState) {
  broadcast(room, {
    type: 'users',
    users: Array.from(room.users.values()),
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
  const session = socketSessions.get(socket);
  if (!session) {
    return;
  }

  const room = rooms.get(session.roomId);
  if (!room) {
    socketSessions.delete(socket);
    return;
  }

  const user = room.users.get(session.userId);
  socketSessions.delete(socket);
  room.sockets.delete(session.userId);
  room.users.delete(session.userId);

  if (user) {
    const message = createMessage({
      roomId: session.roomId,
      kind: 'system',
      text: `${user.nickname} 离开了房间 ${session.roomId}`,
    });
    rememberMessage(room, message);
    broadcast(room, { type: 'system', message });
    broadcastUsers(room);
  }

  cleanupRoom(session.roomId);
}

function handleJoin(socket: WebSocket, roomIdValue: unknown, nicknameValue: unknown) {
  const roomId = normalizeRoomId(roomIdValue);
  const nickname = normalizeNickname(nicknameValue);
  if (!isValidRoomId(roomId)) {
    safeSend(socket, {
      type: 'error',
      message: `房间号需要 2-${maxRoomIdLength} 个字符`,
    });
    return;
  }

  if (!isValidNickname(nickname)) {
    safeSend(socket, {
      type: 'error',
      message: '昵称需要 2-20 个字符',
    });
    return;
  }

  leave(socket);

  const room = getRoom(roomId);
  const user: ChatUser = {
    id: randomUUID(),
    roomId,
    nickname,
    joinedAt: new Date().toISOString(),
  };

  room.users.set(user.id, user);
  room.sockets.set(user.id, socket);
  socketSessions.set(socket, {
    roomId,
    userId: user.id,
  });

  safeSend(socket, {
    type: 'welcome',
    userId: user.id,
    roomId,
    nickname: user.nickname,
    users: Array.from(room.users.values()),
    recentMessages: room.recentMessages,
  });

  const message = createMessage({
    roomId,
    kind: 'system',
    text: `${nickname} 加入了房间 ${roomId}`,
  });
  rememberMessage(room, message);
  broadcast(room, { type: 'system', message });
  broadcastUsers(room);
}

function handleChat(socket: WebSocket, textValue: unknown) {
  const session = socketSessions.get(socket);
  const room = session ? rooms.get(session.roomId) : undefined;
  const user = session && room ? room.users.get(session.userId) : undefined;
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
    roomId: user.roomId,
    kind: 'chat',
    userId: user.id,
    nickname: user.nickname,
    text,
  });
  rememberMessage(room, message);
  broadcast(room, { type: 'chat', message });
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
        handleJoin(socket, message.roomId, message.nickname);
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
