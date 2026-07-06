import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type {
  ChatMessage,
  ChatUser,
  ClientMessage,
  GomokuState,
  GomokuStone,
  RpsChoice,
  ServerMessage,
} from '../shared/chat.js';
import { loadChatHistory, saveChatHistory } from './chatStore.js';

type RpsPending = {
  userId: string;
  nickname: string;
  choice: RpsChoice;
  createdAt: string;
};

type RoomState = {
  users: Map<string, ChatUser>;
  sockets: Map<string, WebSocket>;
  recentMessages: ChatMessage[];
  gomoku: GomokuState;
  rpsStack: RpsPending[];
};

type SocketSession = {
  roomId: string;
  userId: string;
};

const persistedMessages = loadChatHistory();
const rooms = new Map<string, RoomState>();
const socketSessions = new Map<WebSocket, SocketSession>();
const maxRecentMessages = 100;
const maxMessageLength = 800;
const maxRoomIdLength = 32;
const gomokuBoardSize = 15;
const gomokuTotalCells = gomokuBoardSize * gomokuBoardSize;

function createGomokuState(): GomokuState {
  return {
    board: Array(gomokuTotalCells).fill(null),
    moves: [],
    players: {},
    turn: 'black',
    winner: null,
    updatedAt: new Date().toISOString(),
  };
}

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
    recentMessages: persistedMessages[roomId] ?? [],
    gomoku: createGomokuState(),
    rpsStack: [],
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

function getGomokuWinner(board: GomokuState['board'], row: number, col: number, stone: GomokuStone) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  return directions.some(([rowStep, colStep]) => {
    let count = 1;

    for (const direction of [-1, 1]) {
      let nextRow = row + rowStep * direction;
      let nextCol = col + colStep * direction;

      while (
        nextRow >= 0
        && nextRow < gomokuBoardSize
        && nextCol >= 0
        && nextCol < gomokuBoardSize
        && board[nextRow * gomokuBoardSize + nextCol] === stone
      ) {
        count += 1;
        nextRow += rowStep * direction;
        nextCol += colStep * direction;
      }
    }

    return count >= 5;
  });
}

function getAssignedGomokuStone(gomoku: GomokuState, nickname: string): GomokuStone | null {
  if (gomoku.players.black === nickname) {
    return 'black';
  }
  if (gomoku.players.white === nickname) {
    return 'white';
  }
  return null;
}

function getGomokuPlayersFromMoves(moves: GomokuState['moves']) {
  return moves.reduce<GomokuState['players']>((players, move) => {
    if (!players[move.stone]) {
      players[move.stone] = move.nickname;
    }
    return players;
  }, {});
}

function rememberMessage(room: RoomState, message: ChatMessage) {
  room.recentMessages.push(message);
  if (room.recentMessages.length > maxRecentMessages) {
    room.recentMessages.splice(0, room.recentMessages.length - maxRecentMessages);
  }
  persistedMessages[message.roomId] = room.recentMessages;
  saveChatHistory(persistedMessages);
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
    gomoku: room.gomoku,
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

function handleGomokuPlace(socket: WebSocket, indexValue: unknown) {
  const session = socketSessions.get(socket);
  const room = session ? rooms.get(session.roomId) : undefined;
  const user = session && room ? room.users.get(session.userId) : undefined;
  if (!session || !room || !user) {
    safeSend(socket, {
      type: 'error',
      message: '请先进入房间再下棋',
    });
    return;
  }

  const index = Number(indexValue);
  if (!Number.isInteger(index) || index < 0 || index >= gomokuTotalCells) {
    safeSend(socket, {
      type: 'error',
      message: '落子位置不正确',
    });
    return;
  }

  if (room.gomoku.winner || room.gomoku.board[index]) {
    return;
  }

  const row = Math.floor(index / gomokuBoardSize);
  const col = index % gomokuBoardSize;
  const nextBoard = [...room.gomoku.board];
  const stone = room.gomoku.turn;
  const assignedStone = getAssignedGomokuStone(room.gomoku, user.nickname);
  const currentStoneOwner = room.gomoku.players[stone];

  if (assignedStone && assignedStone !== stone) {
    safeSend(socket, {
      type: 'error',
      message: `你已经是${assignedStone === 'black' ? '黑子' : '白子'}，不能替另一方落子`,
    });
    return;
  }

  if (currentStoneOwner && currentStoneOwner !== user.nickname) {
    safeSend(socket, {
      type: 'error',
      message: `现在轮到${currentStoneOwner}的${stone === 'black' ? '黑子' : '白子'}`,
    });
    return;
  }

  const players = {
    ...room.gomoku.players,
    [stone]: currentStoneOwner ?? user.nickname,
  };
  nextBoard[index] = stone;

  const winner = getGomokuWinner(nextBoard, row, col, stone) ? stone : null;
  room.gomoku = {
    board: nextBoard,
    moves: [
      ...room.gomoku.moves,
      {
        index,
        nickname: user.nickname,
        stone,
      },
    ],
    players,
    turn: winner ? stone : stone === 'black' ? 'white' : 'black',
    winner,
    updatedAt: new Date().toISOString(),
  };

  broadcast(room, {
    type: 'game',
    game: 'gomoku',
    gomoku: room.gomoku,
  });

  if (winner) {
    const message = createMessage({
      roomId: session.roomId,
      kind: 'system',
      text: `⚫⚪ 五子棋：${winner === 'black' ? '黑子' : '白子'}获胜`,
    });
    rememberMessage(room, message);
    broadcast(room, { type: 'system', message });
  }
}

function handleGomokuReset(socket: WebSocket) {
  const session = socketSessions.get(socket);
  const room = session ? rooms.get(session.roomId) : undefined;
  const user = session && room ? room.users.get(session.userId) : undefined;
  if (!session || !room || !user) {
    return;
  }

  room.gomoku = createGomokuState();
  broadcast(room, {
    type: 'game',
    game: 'gomoku',
    gomoku: room.gomoku,
  });

  const message = createMessage({
    roomId: session.roomId,
    kind: 'system',
    text: `⚫⚪ ${user.nickname} 重置了五子棋棋盘`,
  });
  rememberMessage(room, message);
  broadcast(room, { type: 'system', message });
}

function handleGomokuUndo(socket: WebSocket) {
  const session = socketSessions.get(socket);
  const room = session ? rooms.get(session.roomId) : undefined;
  const user = session && room ? room.users.get(session.userId) : undefined;
  if (!session || !room || !user) {
    return;
  }

  const lastMove = room.gomoku.moves.at(-1);
  if (!lastMove) {
    safeSend(socket, {
      type: 'error',
      message: '当前没有可以悔的棋',
    });
    return;
  }

  if (lastMove.nickname !== user.nickname) {
    safeSend(socket, {
      type: 'error',
      message: `只能等待 ${lastMove.nickname} 悔自己的上一步棋`,
    });
    return;
  }

  const nextMoves = room.gomoku.moves.slice(0, -1);
  const nextBoard = [...room.gomoku.board];
  nextBoard[lastMove.index] = null;
  room.gomoku = {
    board: nextBoard,
    moves: nextMoves,
    players: getGomokuPlayersFromMoves(nextMoves),
    turn: lastMove.stone,
    winner: null,
    updatedAt: new Date().toISOString(),
  };

  broadcast(room, {
    type: 'game',
    game: 'gomoku',
    gomoku: room.gomoku,
  });

  const message = createMessage({
    roomId: session.roomId,
    kind: 'system',
    text: `↩️ ${user.nickname} 悔了一步五子棋`,
  });
  rememberMessage(room, message);
  broadcast(room, { type: 'system', message });
}

function handleRpsPlay(socket: WebSocket, choiceValue: unknown) {
  const session = socketSessions.get(socket);
  const room = session ? rooms.get(session.roomId) : undefined;
  const user = session && room ? room.users.get(session.userId) : undefined;
  const choices = ['rock', 'paper', 'scissors'] as const;
  if (!session || !room || !user || !choices.includes(choiceValue as typeof choices[number])) {
    return;
  }

  const labels = {
    rock: '石头',
    paper: '布',
    scissors: '剪刀',
  };
  const userChoice = choiceValue as typeof choices[number];
  const existingOwnIndex = room.rpsStack.findIndex((pending) => pending.nickname === user.nickname);
  if (existingOwnIndex >= 0) {
    room.rpsStack.splice(existingOwnIndex, 1);
  }

  const opponent = room.rpsStack.pop();
  if (!opponent) {
    room.rpsStack.push({
      userId: user.id,
      nickname: user.nickname,
      choice: userChoice,
      createdAt: new Date().toISOString(),
    });

    const waitingMessage = createMessage({
      roomId: session.roomId,
      kind: 'system',
      text: '✊✌️✋ 你已出拳，等待另一位玩家',
    });
    safeSend(socket, { type: 'system', message: waitingMessage });
    return;
  }

  const result = userChoice === opponent.choice
    ? '平局'
    : (userChoice === 'rock' && opponent.choice === 'scissors')
      || (userChoice === 'paper' && opponent.choice === 'rock')
      || (userChoice === 'scissors' && opponent.choice === 'paper')
        ? `${user.nickname} 赢了`
        : `${opponent.nickname} 赢了`;

  const message = createMessage({
    roomId: session.roomId,
    kind: 'chat',
    userId: user.id,
    nickname: user.nickname,
    text: `✊✌️✋ 石头剪刀布：${opponent.nickname} 出 ${labels[opponent.choice]}，${user.nickname} 出 ${labels[userChoice]}，${result}`,
  });
  rememberMessage(room, message);
  broadcast(room, { type: 'chat', message });
}

function handleGame(socket: WebSocket, message: ClientMessage) {
  if (message.type !== 'game') {
    return;
  }

  if (message.action === 'gomoku_place') {
    handleGomokuPlace(socket, message.index);
    return;
  }

  if (message.action === 'gomoku_reset') {
    handleGomokuReset(socket);
    return;
  }

  if (message.action === 'gomoku_undo') {
    handleGomokuUndo(socket);
    return;
  }

  if (message.action === 'rps_play') {
    handleRpsPlay(socket, message.choice);
  }
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
        return;
      }

      if (message.type === 'game') {
        handleGame(socket, message);
      }
    });

    socket.on('close', () => leave(socket));
    socket.on('error', () => leave(socket));
  });

  return webSocketServer;
}
