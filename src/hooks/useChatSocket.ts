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
  const reconnectTimerRef = useRef<number | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [userId, setUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId || !nickname) {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setConnectionState('idle');
      setUserId(null);
      setUsers([]);
      setMessages([]);
      return;
    }

    let disposed = false;
    let reconnectAttempt = 0;

    function scheduleReconnect() {
      if (disposed) {
        return;
      }

      const delay = Math.min(1000 * 2 ** reconnectAttempt, 8000);
      reconnectAttempt += 1;
      setConnectionState('connecting');
      setError(`连接已断开，正在自动重连...`);

      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    }

    function connect() {
      const socket = new WebSocket(getSocketUrl());
      socketRef.current = socket;
      setConnectionState('connecting');

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
          reconnectAttempt = 0;
          setConnectionState('connected');
          setError(null);
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
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        if (!disposed) {
          scheduleReconnect();
        }
      });

      socket.addEventListener('error', () => {
        if (!disposed) {
          setError('连接聊天室失败，正在自动重试');
          setConnectionState('disconnected');
        }
      });
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const socket = socketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'leave' }));
      }
      socket?.close();
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
