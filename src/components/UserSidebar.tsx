import { Circle, Users } from 'lucide-react';
import type { ChatUser } from '../../shared/chat';

type UserSidebarProps = {
  currentUserId: string | null;
  users: ChatUser[];
};

export default function UserSidebar({ currentUserId, users }: UserSidebarProps) {
  return (
    <aside className="user-sidebar">
      <div className="sidebar-title">
        <Users size={18} />
        <span>在线成员</span>
        <strong>{users.length}</strong>
      </div>
      <div className="user-list">
        {users.map((user) => (
          <div
            className={`user-pill ${user.id === currentUserId ? 'current' : ''}`}
            key={user.id}
          >
            <Circle size={10} fill="currentColor" />
            <span>{user.nickname}</span>
            {user.id === currentUserId ? <em>我</em> : null}
          </div>
        ))}
      </div>
    </aside>
  );
}
