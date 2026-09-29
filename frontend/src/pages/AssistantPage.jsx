import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot, Send, User, Sparkles, Loader2,
  RotateCcw, MapPin, CloudRain, Brain, Copy, Check
} from 'lucide-react';

import { API_BASE } from '../services/api';

async function sendChatMessage(messages, location, liveWeather = null) {
  const history = messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
  const lastMsg = messages[messages.length - 1];
  
  const payload = {
    message: lastMsg?.content || '',
    district: location.district,
    state: location.state,
    lat: location.latitude,
    lon: location.longitude,
    history,
  };

  if (liveWeather) {
    payload.rainfall = liveWeather.rainfall;
    payload.temperature = liveWeather.temperature;
    payload.humidity = liveWeather.humidity;
    payload.pressure = liveWeather.pressure;
    payload.wind_speed = liveWeather.wind_speed;
    payload.wind_direction = liveWeather.wind_direction;
    payload.weather_description = liveWeather.weather_description;
  }
  
  const res = await fetch(`${API_BASE}/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('AI Assistant is temporarily unavailable. Please try again.');
  }
  return res.json();
}

const SuggestChip = ({ text, onClick }) => (
  <button
    onClick={() => onClick(text)}
    className="text-left px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-blue-600/20
               border border-slate-600/40 hover:border-blue-500/50 text-xs text-slate-300
               hover:text-blue-300 transition-all duration-150 flex items-center gap-1.5"
  >
    <span>{text}</span>
  </button>
);

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy response"
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-600/50 text-slate-500 hover:text-slate-300"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

function formatMessageContent(text) {
  if (!text) return '';
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g);
  return parts.map((part, i) => {
    if (part === '\n') return <br key={i} />;
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="bg-slate-700 text-blue-300 px-1 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
    return part;
  });
}

const Message = ({ msg }) => {
  const isUser = msg.role === 'user';
  const isError = msg.isError;

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 group">
        <div className="max-w-[80%] bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-br-sm text-sm leading-relaxed shadow-sm">
          {msg.content}
        </div>
        <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-slate-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 group">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${
        isError ? 'bg-red-500/20' : 'bg-blue-600/90'
      }`}>
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="max-w-[85%] flex flex-col gap-1">
        <div className={`px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed shadow-sm ${
          isError
            ? 'bg-red-900/30 border border-red-500/30 text-red-200'
            : 'bg-slate-800/90 border border-slate-700/60 text-slate-200'
        }`}>
          <div className="whitespace-pre-wrap">{formatMessageContent(msg.content)}</div>
        </div>
        {!isError && (
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
            <CopyButton text={msg.content} />
          </div>
        )}
      </div>
    </div>
  );
};

const TypingIndicator = () => (
  <div className="flex gap-2">
    <div className="w-7 h-7 rounded-full bg-blue-600/90 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
      <Bot className="w-3.5 h-3.5 text-white" />
    </div>
    <div className="bg-slate-800/90 border border-slate-700/60 px-4 py-3 rounded-2xl rounded-bl-sm">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

export default function AssistantPage({ selectedLocation, liveWeather }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const location = selectedLocation || {
    district: 'New Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.2090
  };

  const SUGGESTIONS = [
    "What is the current rainfall?",
    "What is the weather regime?",
    "Is heavy rainfall expected?",
    "What changed after AI correction?",
    "Explain the current forecast."
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I am the **Rainfall Intelligence Assistant** for **${location.district}, ${location.state}**.\n\nAsk about rainfall, forecast, weather regime, correction, or rainfall risk.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
  }, [location.district, location.state, messages.length]);

  const handleSend = useCallback(async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const history = [...messages, userMsg]
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await sendChatMessage(history, location, liveWeather);
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: resp.reply || resp.message || 'AI Assistant is temporarily unavailable. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'AI Assistant is temporarily unavailable. Please try again.',
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, isLoading, messages, location, liveWeather]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Conversation cleared. I am ready to answer questions for **${location.district}, ${location.state}**. Ask about rainfall, forecast, weather regime, correction, or rainfall risk.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-130px)] sm:h-[calc(100vh-140px)] max-h-[850px] space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl px-3.5 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-600 flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white">AI Assistant</h1>
              <span className="text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50 truncate max-w-[140px] sm:max-w-none">
                {location.district}, {location.state}
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-400 mt-0.5">
              Ask about rainfall, forecast, weather regime, correction, or rainfall risk.
            </p>
          </div>
        </div>

        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition-all shadow-xs shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Suggested Questions */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mr-1">Suggested:</span>
        {SUGGESTIONS.map((q) => (
          <SuggestChip key={q} text={q} onClick={(val) => handleSend(val)} />
        ))}
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 min-h-0 bg-slate-900/70 border border-slate-800 rounded-xl sm:rounded-2xl flex flex-col overflow-hidden shadow-inner">
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 sm:space-y-4" id="chat-messages">
          {messages.map((msg) => (
            <Message key={msg.id} msg={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-2.5 sm:p-4 bg-slate-900 border-t border-slate-800">
          <div className="flex items-end gap-2 bg-slate-800 border border-slate-700 rounded-xl p-1.5 sm:p-2 focus-within:border-blue-500 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${location.district} rainfall, regime, correction...`}
              rows={1}
              className="flex-1 bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500
                         focus:outline-hidden resize-none px-2 py-1 min-h-[36px] max-h-28"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="h-9 px-3.5 sm:px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700
                         text-white text-xs font-semibold flex items-center gap-1.5 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-xs"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send</span>
            </button>
          </div>
          <div className="text-center text-[9px] sm:text-[10px] text-slate-500 mt-1.5 sm:mt-2">
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}
