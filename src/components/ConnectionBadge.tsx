import { Wifi, WifiOff } from 'lucide-react';

type ConnectionBadgeProps = {
  state: 'idle' | 'connecting' | 'connected' | 'disconnected';
};

const labels = {
  idle: '未连接',
  connecting: '连接中',
  connected: '已连接',
  disconnected: '已断开',
};

export default function ConnectionBadge({ state }: ConnectionBadgeProps) {
  const Icon = state === 'connected' ? Wifi : WifiOff;

  return (
    <span className={`connection-badge ${state}`}>
      <Icon size={15} />
      {labels[state]}
    </span>
  );
}
