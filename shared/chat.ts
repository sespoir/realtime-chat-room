export type ChatUser = {
  id: string;
  roomId: string;
  nickname: string;
  joinedAt: string;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  kind: 'chat' | 'system';
  userId?: string;
  nickname?: string;
  text: string;
  createdAt: string;
};

export type GomokuStone = 'black' | 'white';

export type GomokuCell = GomokuStone | null;

export type GomokuPlayers = {
  black?: string;
  white?: string;
};

export type GomokuState = {
  board: GomokuCell[];
  players: GomokuPlayers;
  turn: GomokuStone;
  winner: GomokuStone | null;
  updatedAt: string;
};

export type RpsChoice = 'rock' | 'paper' | 'scissors';

export type ClientJoinMessage = {
  type: 'join';
  roomId: string;
  nickname: string;
  authProvider?: 'nickname' | 'bytedance' | 'alibaba';
};

export type ClientChatMessage = {
  type: 'chat';
  text: string;
};

export type ClientLeaveMessage = {
  type: 'leave';
};

export type ClientGameMessage =
  | {
      type: 'game';
      action: 'gomoku_place';
      index: number;
    }
  | {
      type: 'game';
      action: 'gomoku_reset';
    }
  | {
      type: 'game';
      action: 'rps_play';
      choice: RpsChoice;
    };

export type ClientMessage =
  | ClientJoinMessage
  | ClientChatMessage
  | ClientLeaveMessage
  | ClientGameMessage;

export type ServerWelcomeMessage = {
  type: 'welcome';
  userId: string;
  roomId: string;
  nickname: string;
  users: ChatUser[];
  recentMessages: ChatMessage[];
  gomoku: GomokuState;
};

export type ServerChatMessage = {
  type: 'chat';
  message: ChatMessage;
};

export type ServerSystemMessage = {
  type: 'system';
  message: ChatMessage;
};

export type ServerUsersMessage = {
  type: 'users';
  users: ChatUser[];
};

export type ServerErrorMessage = {
  type: 'error';
  message: string;
};

export type ServerGameMessage = {
  type: 'game';
  game: 'gomoku';
  gomoku: GomokuState;
};

export type ServerMessage =
  | ServerWelcomeMessage
  | ServerChatMessage
  | ServerSystemMessage
  | ServerUsersMessage
  | ServerErrorMessage
  | ServerGameMessage;
