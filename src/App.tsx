import { Navigate, Route, BrowserRouter as Router, Routes, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ChatPage from '@/pages/ChatPage';
import EntryPage from '@/pages/EntryPage';

function ChatApp() {
  const [nickname, setNickname] = useState<string | null>(() => {
    return window.sessionStorage.getItem('chat.nickname');
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (nickname) {
      window.sessionStorage.setItem('chat.nickname', nickname);
    } else {
      window.sessionStorage.removeItem('chat.nickname');
    }
  }, [nickname]);

  function enter(nextNickname: string) {
    setNickname(nextNickname);
    navigate('/chat');
  }

  function leave() {
    setNickname(null);
    navigate('/');
  }

  return (
    <Routes>
      <Route path="/" element={<EntryPage onEnter={enter} />} />
      <Route
        path="/chat"
        element={
          nickname
            ? <ChatPage nickname={nickname} onLeave={leave} />
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
