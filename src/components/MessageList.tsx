import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../shared/chat';

type MessageListProps = {
  currentUserId: string | null;
  messages: ChatMessage[];
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function MessageList({ currentUserId, messages }: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="empty-messages">
        <strong>聊天室已准备好</strong>
        <span>发送第一条消息，其他在线成员会立即看到。</span>
      </div>
    );
  }

  return (
    <div className="message-list" role="log" aria-live="polite">
      {messages.map((message) => {
        if (message.kind === 'system') {
          return (
            <div className="system-message" key={message.id}>
              {message.text}
            </div>
          );
        }

        const isMine = message.userId === currentUserId;
        return (
          <article className={`message-row ${isMine ? 'mine' : ''}`} key={message.id}>
            <div className="message-meta">
              <strong>{message.nickname}</strong>
              <span>{formatTime(message.createdAt)}</span>
            </div>
            <p>{message.text}</p>
          </article>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
