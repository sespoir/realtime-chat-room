import { FormEvent, KeyboardEvent, useState } from 'react';
import { Laugh, SendHorizontal } from 'lucide-react';

type MessageComposerProps = {
  disabled: boolean;
  onSend: (text: string) => boolean;
};

const stickerPacks = [
  { label: '开心', value: '😄' },
  { label: '赞', value: '👍' },
  { label: '鼓掌', value: '👏' },
  { label: '收到', value: '👌' },
  { label: '思考', value: '🤔' },
  { label: '庆祝', value: '🎉' },
  { label: '加油', value: '💪' },
  { label: '笑哭', value: '😂' },
];

export default function MessageComposer({ disabled, onSend }: MessageComposerProps) {
  const [text, setText] = useState('');

  function submit() {
    if (onSend(text)) {
      setText('');
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  function sendSticker(sticker: string) {
    if (disabled) {
      return;
    }
    onSend(sticker);
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <div className="sticker-toolbar" aria-label="表情包快捷发送">
        <span>
          <Laugh size={16} />
          表情包
        </span>
        <div className="sticker-list">
          {stickerPacks.map((sticker) => (
            <button
              aria-label={`发送${sticker.label}表情`}
              className="sticker-button"
              disabled={disabled}
              key={sticker.label}
              onClick={() => sendSticker(sticker.value)}
              type="button"
            >
              {sticker.value}
            </button>
          ))}
        </div>
      </div>
      <div className="composer-row">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? '连接后即可发送消息' : '输入消息，Enter 发送，Shift + Enter 换行'}
          maxLength={800}
          disabled={disabled}
        />
        <button className="send-button" type="submit" disabled={disabled || !text.trim()}>
          <SendHorizontal size={18} />
          发送
        </button>
      </div>
    </form>
  );
}
