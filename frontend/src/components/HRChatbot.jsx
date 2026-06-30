import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot } from 'lucide-react';
import { useNotify } from '../context/NotificationContext';
import './HRChatbot.css';
import API_BASE_URL from '../utils/api';

const HRChatbot = () => {
  const { showNotification } = useNotify();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Hello! I can help with this HR system: leave requests, attendance, performance metrics, reports, PDFs, notifications, profiles, and hourly updates.',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const announcementTimerRef = useRef(null);

  useEffect(() => {
    const hasBeenAnnounced = sessionStorage.getItem('chatbot_announced');
    if (!hasBeenAnnounced) {
      sessionStorage.setItem('chatbot_announced', 'true');
      announcementTimerRef.current = setTimeout(() => {
        showNotification('AI HR Assistant is ready. Click the bubble to chat.', 'info');
      }, 2000);
    }

    return () => {
      if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    };
  }, [showNotification]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chatbot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.text })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Chatbot request failed');
      }

      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: data.response || 'I can answer questions about this HR system only.',
          sender: 'ai',
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 500);
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: 'Sorry, I could not reach the HR system right now. Please try again later.',
        sender: 'ai',
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }
  };

  return (
    <div className="chatbot-container">
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                <Bot size={20} />
              </div>
              <div>
                <h3>HR Assistant</h3>
                <p>System help</p>
              </div>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="icon-btn chatbot-close">
              <X size={20} />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.sender === 'ai' ? 'message-ai' : 'message-user'}`}>
                {msg.text}
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {isTyping && (
              <div className="message message-ai">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-input-area" onSubmit={handleSend}>
            <input
              type="text"
              className="chatbot-input"
              placeholder="Ask about this HR system..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isTyping}
            />
            <button type="submit" className="chatbot-send" disabled={!message.trim() || isTyping}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className={`chatbot-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? 'Close HR assistant' : 'Open HR assistant'}
      >
        {isOpen ? <X size={28} /> : (
          <>
            <MessageCircle size={28} />
            <span className="chatbot-notification-dot"></span>
          </>
        )}
      </button>
    </div>
  );
};

export default HRChatbot;
