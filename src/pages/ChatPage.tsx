import { LogOut, ShieldCheck } from 'lucide-react';
import ConnectionBadge from '@/components/ConnectionBadge';
import MessageComposer from '@/components/MessageComposer';
import MessageList from '@/components/MessageList';
import RoomTools from '@/components/RoomTools';
import UserSidebar from '@/components/UserSidebar';
import { useChatSocket } from '@/hooks/useChatSocket';

type ChatPageProps = {
  roomId: string;
  nickname: string;
  onLeave: () => void;
};

export default function ChatPage({ roomId, nickname, onLeave }: ChatPageProps) {
  const {
    connectionState,
    error,
    gomoku,
    messages,
    sendGameAction,
    sendMessage,
    userId,
    users,
  } = useChatSocket(roomId, nickname);

  return (
    <main className="chat-shell">
      <section className="chat-frame">
        <header className="chat-header">
          <div>
            <span className="eyebrow">
              <ShieldCheck size={15} />
              房间 {roomId}
            </span>
            <h1>房间聊天室</h1>
          </div>
          <div className="header-actions">
            <ConnectionBadge state={connectionState} />
            <span className="current-name">{nickname}</span>
            <button className="ghost-button" type="button" onClick={onLeave}>
              <LogOut size={16} />
              退出
            </button>
          </div>
        </header>

        <div className="mobile-users">
          当前在线 {users.length} 人
        </div>

        <div className="chat-layout">
          <UserSidebar currentUserId={userId} users={users} />
          <section className="conversation-panel" aria-label="公共聊天消息">
            {error ? <div className="error-banner">{error}</div> : null}
            <MessageList
              currentNickname={nickname}
              currentUserId={userId}
              messages={messages}
            />
            <MessageComposer
              disabled={connectionState !== 'connected'}
              onSend={sendMessage}
            />
          </section>
          <RoomTools
            disabled={connectionState !== 'connected'}
            gomoku={gomoku}
            onGameAction={sendGameAction}
            onSend={sendMessage}
          />
        </div>
      </section>
    </main>
  );
}
