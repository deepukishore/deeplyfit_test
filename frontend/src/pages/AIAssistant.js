import React, { useState, useRef, useEffect } from 'react';
import { Bot, Camera, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import toast from 'react-hot-toast';
import { canChat, incrementChatCount, chatsLeft, isPro } from '../utils/premium';
import PremiumModal from '../components/PremiumModal';
import '../styles/assistant.css';

function Message({ msg, userInitials }) {
  const isUser = msg.role === 'user';
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'} animate-slide-up`}>
      {isUser ? (
        <>
          <div className="message-bubble user-bubble">
            <div className="message-text">{msg.content}</div>
            <div className="message-time">{timeStr}</div>
          </div>
          <div className="user-avatar">{userInitials}</div>
        </>
      ) : (
        <>
          <div className="assistant-avatar"><Bot size={17} /></div>
          <div className="message-bubble assistant-bubble">
            <div className="message-text">{msg.content}</div>
            <div className="message-time">{timeStr}</div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hey ${user?.name || 'there'}! 👋 I'm your Deeply Fit AI coach. I have access to your nutrition logs, weight history, and workout data. Ask me anything — I'm here to help you reach your goals! 💪`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const inputSnapshotRef = useRef('');
  const premiumActive = isPro(user);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const sendMessage = async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage || loading) return;

    if (!canChat(premiumActive)) {
      setShowPremium(true);
      return;
    }

    inputSnapshotRef.current = input;
    setInput('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map((message) => ({ role: message.role, content: message.content }));
      const response = await api.chat({ message: userMessage, history });
      incrementChatCount();
      setMessages((prev) => [...prev, { role: 'assistant', content: response.response }]);
    } catch (err) {
      toast.error(err.message || 'Could not reach AI coach');
      setInput(inputSnapshotRef.current);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Fresh start! 🌟 What would you like to work on today, ${user?.name || 'there'}?`,
      },
    ]);
    setInput('');
  };

  const getInitials = () => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map((word) => word[0].toUpperCase())
        .slice(0, 2)
        .join('');
    }

    if (user?.email) {
      return user.email[0].toUpperCase();
    }

    return '?';
  };

  return (
    <div className="assistant-page">
      <div className="assistant-header">
        <div className="assistant-header-left">
          <div className="assistant-icon"><Bot size={23} /></div>
          <div>
            <h1 className="assistant-title">AI Coach</h1>
            <p className="assistant-status">
              <span className="status-dot" />
              Online · Knows your data
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!premiumActive && (
            <span className="badge badge-amber" style={{ cursor: 'pointer' }} onClick={() => setShowPremium(true)}>
              {chatsLeft(premiumActive)} msg{chatsLeft(premiumActive) !== 1 ? 's' : ''} left
            </span>
          )}
          {premiumActive && <span className="badge badge-pro">💎 PRO</span>}
          <button className="btn btn-ghost btn-sm assistant-clear-btn" onClick={clearChat} aria-label="Clear chat" title="Clear chat">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} userInitials={getInitials()} />
        ))}

        {loading && (
          <div className="chat-message assistant">
            <div className="assistant-avatar"><Bot size={17} /></div>
            <div className="message-bubble assistant-bubble typing-bubble">
              <div className="typing-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-container">
        {!premiumActive && chatsLeft(premiumActive) === 0 ? (
          <div className="chat-limit-wall">
            <p className="scan-limit-msg">You've used all 10 free messages for today.</p>
            <p className="scan-limit-sub">Upgrade to PRO for unlimited AI coaching ✨</p>
            <button className="btn premium-btn btn-full" onClick={() => setShowPremium(true)}>
              💎 Upgrade to PRO
            </button>
          </div>
        ) : (
          <div className="chat-input-wrapper">
            <span className="chat-camera-icon" aria-hidden="true"><Camera size={19} /></span>
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder={premiumActive ? 'Ask your AI coach anything...' : `Ask your AI coach anything... (${chatsLeft(premiumActive)} left today)`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className={`send-btn ${input.trim() ? 'active' : ''}`}
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
            >
              {loading ? <span className="spinner" /> : <Send size={17} />}
            </button>
          </div>
        )}
        <p className="input-hint">Enter to send · Shift+Enter for new line</p>
      </div>

      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} onActivated={() => setShowPremium(false)} />}
    </div>
  );
}
