export type ChatUser = {
  id: string;
  nickname: string;
  joinedAt: string;
};

export type ChatMessage = {
  id: string;
  kind: 'chat' | 'system';
  userId?: string;
  nickname?: string;
  text: string;
  createdAt: string;
};

export type ClientJoinMessage = {
  type: 'join';
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

export type ClientMessage =
  | ClientJoinMessage
  | ClientChatMessage
  | ClientLeaveMessage;

export type ServerWelcomeMessage = {
  type: 'welcome';
  userId: string;
  nickname: string;
  users: ChatUser[];
  recentMessages: ChatMessage[];
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

export type ServerMessage =
  | ServerWelcomeMessage
  | ServerChatMessage
  | ServerSystemMessage
  | ServerUsersMessage
  | ServerErrorMessage;
