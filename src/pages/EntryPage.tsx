import { FormEvent, useState } from 'react';
import { Building2, MessageCircle, Sparkles } from 'lucide-react';

type EntryPageProps = {
  onEnter: (nickname: string) => void;
};

export default function EntryPage({ onEnter }: EntryPageProps) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextNickname = nickname.trim().replace(/\s+/g, ' ');

    if (nextNickname.length < 2 || nextNickname.length > 20) {
      setError('昵称需要 2-20 个字符');
      return;
    }

    setError('');
    onEnter(nextNickname);
  }

  return (
    <main className="entry-shell">
      <section className="entry-hero" aria-labelledby="entry-title">
        <div className="orb orb-cyan" />
        <div className="orb orb-amber" />
        <div className="entry-copy">
          <span className="eyebrow">
            <Sparkles size={16} />
            公共聊天室 · 第一版
          </span>
          <h1 id="entry-title">用一个 ID，进入同一个实时聊天现场</h1>
          <p>
            先用昵称自由进入公共房间，实时看到在线成员、系统提示和群聊消息。
            字节与阿里登录入口已预留，后续接入真实 SSO 时不会影响聊天主流程。
          </p>
        </div>

        <form className="entry-card" onSubmit={handleSubmit}>
          <div className="card-heading">
            <MessageCircle size={28} />
            <div>
              <h2>进入聊天室</h2>
              <p>输入一个展示 ID 即可开始聊天</p>
            </div>
          </div>

          <label className="field-label" htmlFor="nickname">
            你的昵称
          </label>
          <input
            id="nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="例如：ByteTalker"
            maxLength={20}
            autoComplete="nickname"
          />
          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" type="submit">
            进入公共聊天室
          </button>

          <div className="provider-grid" aria-label="企业登录入口占位">
            <button type="button" className="provider-button" title="后续可接入字节 SSO">
              <Building2 size={18} />
              字节登录
              <span>预留</span>
            </button>
            <button type="button" className="provider-button" title="后续可接入阿里 SSO">
              <Building2 size={18} />
              阿里登录
              <span>预留</span>
            </button>
          </div>

          <p className="fine-print">
            当前版本不做真实身份认证，昵称只用于聊天室展示。
          </p>
        </form>
      </section>
    </main>
  );
}
