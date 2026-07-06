import { FormEvent, useState } from 'react';
import { Hash, MessageCircle, Sparkles } from 'lucide-react';
import type { ChatEntry } from '@/App';

type EntryPageProps = {
  initialEntry: ChatEntry | null;
  onEnter: (entry: ChatEntry) => void;
};

export default function EntryPage({ initialEntry, onEnter }: EntryPageProps) {
  const [roomId, setRoomId] = useState(initialEntry?.roomId ?? '');
  const [nickname, setNickname] = useState(initialEntry?.nickname ?? '');
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextRoomId = roomId.trim().replace(/\s+/g, '-');
    const nextNickname = nickname.trim().replace(/\s+/g, ' ');

    if (nextRoomId.length < 2 || nextRoomId.length > 32) {
      setError('房间号需要 2-32 个字符');
      return;
    }

    if (nextNickname.length < 2 || nextNickname.length > 20) {
      setError('昵称需要 2-20 个字符');
      return;
    }

    setError('');
    onEnter({
      roomId: nextRoomId,
      nickname: nextNickname,
    });
  }

  return (
    <main className="entry-shell">
      <section className="entry-hero" aria-labelledby="entry-title">
        <div className="orb orb-cyan" />
        <div className="orb orb-amber" />
        <div className="entry-copy">
          <span className="eyebrow">
            <Sparkles size={16} />
            房间制聊天室 · 可重返
          </span>
          <h1 id="entry-title">输入房间号，进入只属于这组人的聊天现场</h1>
          <p>
            每个房间号都是一个独立聊天室。使用相同房间号和昵称重新进入时，
            还能看到这个房间之前保留的消息记录。
          </p>
        </div>

        <form className="entry-card" onSubmit={handleSubmit}>
          <div className="card-heading">
            <MessageCircle size={28} />
            <div>
              <h2>进入聊天室</h2>
              <p>输入房间号和展示 ID 即可开始聊天</p>
            </div>
          </div>

          <label className="field-label" htmlFor="roomId">
            房间号
          </label>
          <div className="input-with-icon">
            <Hash size={18} />
            <input
              id="roomId"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              placeholder="例如：team-2026"
              maxLength={32}
              autoComplete="off"
            />
          </div>

          <label className="field-label" htmlFor="nickname">
            你的昵称
          </label>
          <div className="input-with-icon">
            <MessageCircle size={18} />
            <input
              id="nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="例如：ByteTalker"
              maxLength={20}
              autoComplete="nickname"
            />
          </div>
          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" type="submit">
            进入指定房间
          </button>

          <p className="fine-print">
            当前版本不做真实身份认证；房间消息保存在服务端运行内存中，服务重启后会清空。
          </p>
        </form>
      </section>
    </main>
  );
}
