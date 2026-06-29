import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import toast from 'react-hot-toast';
import { canChat, incrementChatCount, chatsLeft, isPro } from '../utils/premium';
import PremiumModal from '../components/PremiumModal';
import '../styles/assistant.css';

const QUICK_SUGGESTIONS = [
  'What should I eat for lunch? 🍽️',
  'Why am I not losing weight? 🤔',
  'How much protein did I have today? 💪',
  'Give me a workout suggestion 🏋️',
  'Am I on track this week? 📊',
  'What is my calorie deficit today? 🔥',
  'Motivate me! ⚡',
  'Best foods for my goal? 🥗',
];

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
          <div className="assistant-avatar">🤖</div>
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

    if (!canChat()) {
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
          <div className="assistant-icon">🤖</div>
          <div>
            <h1 className="assistant-title">AI Coach</h1>
            <p className="assistant-status">
              <span className="status-dot" />
              Online · Knows your data
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isPro() && (
            <span className="badge badge-amber" style={{ cursor: 'pointer' }} onClick={() => setShowPremium(true)}>
              {chatsLeft()} msg{chatsLeft() !== 1 ? 's' : ''} left
            </span>
          )}
          {isPro() && <span className="badge badge-pro">💎 PRO</span>}
          <button className="btn btn-ghost btn-sm" onClick={clearChat}>
            Clear
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} userInitials={getInitials()} />
        ))}

        {loading && (
          <div className="chat-message assistant">
            <div className="assistant-avatar">🤖</div>
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

      {false && messages.length <= 1 && (
        <div className="suggestions-container">
          <p className="suggestions-label">💡 Try asking:</p>
          <div className="suggestions-scroll">
            {QUICK_SUGGESTIONS.map((suggestion, i) => (
              <button key={i} className="suggestion-chip" onClick={() => sendMessage(suggestion)} disabled={loading}>
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat-input-container">
        {!isPro() && chatsLeft() === 0 ? (
          <div className="chat-limit-wall">
            <p className="scan-limit-msg">You've used all 10 free messages for today.</p>
            <p className="scan-limit-sub">Upgrade to PRO for unlimited AI coaching ✨</p>
            <button className="btn premium-btn btn-full" onClick={() => setShowPremium(true)}>
              💎 Upgrade to PRO
            </button>
          </div>
        ) : (
          <div className="chat-input-wrapper">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder={isPro() ? 'Ask your AI coach anything...' : `Ask your AI coach anything... (${chatsLeft()} left today)`}
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
              {loading ? <span className="spinner" /> : <span>↑</span>}
            </button>
          </div>
        )}
        <p className="input-hint">Enter to send · Shift+Enter for new line</p>
      </div>

      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} onActivated={() => setShowPremium(false)} />}
    </div>
  );
}
