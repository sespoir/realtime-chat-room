import { FormEvent, KeyboardEvent, useState } from 'react';
import { SendHorizontal } from 'lucide-react';

type MessageComposerProps = {
  disabled: boolean;
  onSend: (text: string) => boolean;
};

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

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? '连接后即可发送消息' : '输入消息，Enter 发送，Shift + Enter 换行'}
        maxLength={800}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || !text.trim()}>
        <SendHorizontal size={18} />
        发送
      </button>
    </form>
  );
}
