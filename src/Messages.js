import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { logError } from './logError';

function buildChatId(a, b) {
  return [a, b].sort().join('_');
}

function Messages({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [chats, setChats] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [activeChatId, setActiveChatId] = useState('');
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadInitial = async () => {
      if (!currentUser?.uid) return;
      setLoading(true);
      setError('');
      try {
        const usersSnap = await getDocs(collection(db, 'userProfiles'));
        const allUsers = usersSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.id !== currentUser.uid);

        const map = {};
        for (const u of allUsers) {
          map[u.id] = u;
        }
        setUsers(allUsers);
        setUsersById(map);

        const chatsSnap = await getDocs(
          query(collection(db, 'privateChats'), where('participants', 'array-contains', currentUser.uid))
        );

        const chatRows = chatsSnap.docs.map((d) => {
          const data = d.data();
          const otherUserId = (data.participants || []).find((id) => id !== currentUser.uid) || '';
          return {
            id: d.id,
            ...data,
            otherUserId,
          };
        });

        chatRows.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
        setChats(chatRows);

        if (chatRows.length > 0) {
          setActiveChatId(chatRows[0].id);
        }
      } catch (e) {
        logError('Messages.loadInitial', e);
        setError('Failed to load messages.');
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, 'privateChats', activeChatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (e) => {
        logError('Messages.onSnapshot', e);
        setError('Failed to listen for new messages.');
      }
    );

    return () => unsub();
  }, [activeChatId]);

  const activeChat = useMemo(() => chats.find((c) => c.id === activeChatId) || null, [chats, activeChatId]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startChat = async () => {
    if (!selectedUserId || !currentUser?.uid) return;
    const chatId = buildChatId(currentUser.uid, selectedUserId);

    try {
      await setDoc(
        doc(db, 'privateChats', chatId),
        {
          participants: [currentUser.uid, selectedUserId].sort(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: '',
        },
        { merge: true }
      );

      const already = chats.some((c) => c.id === chatId);
      if (!already) {
        setChats((prev) => [
          {
            id: chatId,
            participants: [currentUser.uid, selectedUserId].sort(),
            otherUserId: selectedUserId,
            updatedAt: { toMillis: () => Date.now() },
            lastMessage: '',
          },
          ...prev,
        ]);
      }
      setActiveChatId(chatId);
      setSelectedUserId('');
      setError('');
    } catch (e) {
      logError('Messages.startChat', e);
      setError('Unable to start chat.');
    }
  };

  const sendMessage = async () => {
    const text = messageText.trim();
    if (!text || !activeChatId || !currentUser?.uid) return;

    setSending(true);
    setError('');
    try {
      await addDoc(collection(db, 'privateChats', activeChatId, 'messages'), {
        text,
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, 'privateChats', activeChatId),
        {
          updatedAt: serverTimestamp(),
          lastMessage: text,
          lastSenderId: currentUser.uid,
        },
        { merge: true }
      );

      setMessageText('');
    } catch (e) {
      logError('Messages.sendMessage', e);
      setError('Message failed to send.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <p className="loading-text">Loading messages...</p>;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Private Messages</h2>
        <p className="page-subtitle">Only participants can see each conversation.</p>
      </div>

      <div className="messages-layout">
        <div className="messages-sidebar">
          <div className="messages-start-row">
            <select
              className="input"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Start new chat...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.displayName || u.email || u.id}</option>
              ))}
            </select>
            <button className="primary-btn" onClick={startChat} disabled={!selectedUserId}>Start</button>
          </div>

          <div className="messages-chat-list">
            {chats.length === 0 ? <p className="muted">No conversations yet.</p> : null}
            {chats.map((chat) => {
              const partner = usersById[chat.otherUserId] || {};
              const initial = (partner.displayName || partner.email || '?')[0]?.toUpperCase() || '?';
              return (
                <button
                  key={chat.id}
                  className={`messages-chat-item${activeChatId === chat.id ? ' active' : ''}`}
                  onClick={() => setActiveChatId(chat.id)}
                >
                  <div className="avatar avatar-sm">
                    {partner.photoURL ? <img className="avatar-img" src={partner.photoURL} alt="Profile" /> : initial}
                  </div>
                  <div className="messages-chat-meta">
                    <div className="messages-chat-name">{partner.displayName || partner.email || 'User'}</div>
                    <div className="messages-chat-last">{chat.lastMessage || 'No messages yet'}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="messages-main">
          {!activeChat ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <p className="empty-title">Select a chat</p>
              <p className="empty-desc">Pick a conversation or start a new private chat.</p>
            </div>
          ) : (() => {
            const partner = usersById[activeChat.otherUserId] || {};
            const initial = (partner.displayName || partner.email || '?')[0]?.toUpperCase() || '?';
            return (
              <>
                <div className="messages-thread-header">
                  <div className="avatar avatar-sm">
                    {partner.photoURL
                      ? <img className="avatar-img" src={partner.photoURL} alt="Profile" />
                      : initial}
                  </div>
                  <div className="messages-thread-header-info">
                    <div className="messages-thread-name">{partner.displayName || partner.email || 'User'}</div>
                  </div>
                </div>

                <div className="messages-thread">
                  {messages.length === 0 ? (
                    <div className="messages-empty-chat">
                      <div className="avatar avatar-xl">
                        {partner.photoURL
                          ? <img className="avatar-img" src={partner.photoURL} alt="Profile" />
                          : initial}
                      </div>
                      <div className="messages-empty-chat-name">{partner.displayName || partner.email || 'User'}</div>
                      <div className="messages-empty-chat-hint">Say hello 👋</div>
                    </div>
                  ) : null}
                  {messages.map((m) => {
                    const mine = m.senderId === currentUser.uid;
                    const ts = m.createdAt?.toDate?.();
                    const timeStr = ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    return (
                      <div key={m.id} className={`messages-bubble-row${mine ? ' mine' : ''}`}>
                        {!mine && (
                          <div className="avatar avatar-xs messages-bubble-avatar">
                            {partner.photoURL
                              ? <img className="avatar-img" src={partner.photoURL} alt="" />
                              : initial}
                          </div>
                        )}
                        <div className="messages-bubble-wrap">
                          <div className={`messages-bubble${mine ? ' mine' : ''}`}>{m.text}</div>
                          {timeStr ? <div className={`messages-bubble-time${mine ? ' mine' : ''}`}>{timeStr}</div> : null}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="messages-compose">
                  <input
                    className="input messages-compose-input"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <button
                    className="messages-send-btn"
                    onClick={sendMessage}
                    disabled={sending || !messageText.trim()}
                    aria-label="Send"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}

export default Messages;
