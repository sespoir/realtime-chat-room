import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChatMessage,
  ChatUser,
  ServerMessage,
} from '../../shared/chat';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected';

function getSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const isViteDev = window.location.port === '5173';
  const host = isViteDev ? `${window.location.hostname}:3001` : window.location.host;
  return `${protocol}//${host}/ws`;
}

export function useChatSocket(roomId: string | null, nickname: string | null) {
  const socketRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [userId, setUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId || !nickname) {
      setConnectionState('idle');
      setUserId(null);
      setUsers([]);
      setMessages([]);
      return;
    }

    const socket = new WebSocket(getSocketUrl());
    socketRef.current = socket;
    setConnectionState('connecting');
    setError(null);

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({
        type: 'join',
        roomId,
        nickname,
        authProvider: 'nickname',
      }));
    });

    socket.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data) as ServerMessage;

      if (payload.type === 'welcome') {
        setConnectionState('connected');
        setUserId(payload.userId);
        setUsers(payload.users);
        setMessages(payload.recentMessages);
        return;
      }

      if (payload.type === 'users') {
        setUsers(payload.users);
        return;
      }

      if (payload.type === 'chat' || payload.type === 'system') {
        setMessages((current) => [...current, payload.message]);
        return;
      }

      if (payload.type === 'error') {
        setError(payload.message);
      }
    });

    socket.addEventListener('close', () => {
      setConnectionState('disconnected');
    });

    socket.addEventListener('error', () => {
      setError('连接聊天室失败，请检查服务是否启动');
      setConnectionState('disconnected');
    });

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'leave' }));
      }
      socket.close();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [roomId, nickname]);

  const sendMessage = useCallback((text: string) => {
    const socket = socketRef.current;
    const trimmedText = text.trim();

    if (!trimmedText || !socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(JSON.stringify({
      type: 'chat',
      text: trimmedText,
    }));
    return true;
  }, []);

  const value = useMemo(() => ({
    connectionState,
    error,
    messages,
    sendMessage,
    userId,
    users,
  }), [connectionState, error, messages, sendMessage, userId, users]);

  return value;
}
