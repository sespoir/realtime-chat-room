import { Navigate, Route, BrowserRouter as Router, Routes, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ChatPage from '@/pages/ChatPage';
import EntryPage from '@/pages/EntryPage';

export type ChatEntry = {
  roomId: string;
  nickname: string;
};

const activeEntryKey = 'chat.activeEntry';
const lastEntryKey = 'chat.lastEntry';

function readStoredEntry(key: string): ChatEntry | null {
  try {
    const rawEntry = window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
    return rawEntry ? JSON.parse(rawEntry) as ChatEntry : null;
  } catch {
    return null;
  }
}

function ChatApp() {
  const [entry, setEntry] = useState<ChatEntry | null>(() => readStoredEntry(activeEntryKey));
  const [lastEntry, setLastEntry] = useState<ChatEntry | null>(() => readStoredEntry(lastEntryKey));
  const navigate = useNavigate();

  useEffect(() => {
    if (entry) {
      const serializedEntry = JSON.stringify(entry);
      window.sessionStorage.setItem(activeEntryKey, serializedEntry);
      window.localStorage.setItem(lastEntryKey, serializedEntry);
      setLastEntry(entry);
    } else {
      window.sessionStorage.removeItem(activeEntryKey);
    }
  }, [entry]);

  function enter(nextEntry: ChatEntry) {
    setEntry(nextEntry);
    navigate('/chat');
  }

  function leave() {
    setEntry(null);
    navigate('/');
  }

  return (
    <Routes>
      <Route path="/" element={<EntryPage initialEntry={lastEntry} onEnter={enter} />} />
      <Route
        path="/chat"
        element={
          entry
            ? <ChatPage roomId={entry.roomId} nickname={entry.nickname} onLeave={leave} />
            : <Navigate to="/" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <ChatApp />
    </Router>
  );
}
