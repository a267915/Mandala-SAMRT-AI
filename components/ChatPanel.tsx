
import React, { useState, useRef, useEffect } from 'react';
import { Send, Search, Bot, Loader2, X } from 'lucide-react';
import { chatWithGemini } from '../services/geminiService';
import { ChatMessage } from '../types';

interface ChatPanelProps {
    messages: ChatMessage[];
    onUpdateMessages: (newMessages: ChatMessage[]) => void;
    onClose: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onUpdateMessages, onClose }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    
    const updatedWithUser = [...messages, { role: 'user', text: userMsg } as ChatMessage];
    onUpdateMessages(updatedWithUser);
    
    setIsLoading(true);

    try {
      // Convert to history format for SDK
      const history = updatedWithUser.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await chatWithGemini(history, userMsg, useSearch);
      
      onUpdateMessages([...updatedWithUser, { 
        role: 'model', 
        text: response.text || "我無法產生回應。",
        grounding: response.grounding
      }]);
    } catch (e) {
      onUpdateMessages([...updatedWithUser, { role: 'model', text: "抱歉，發生了錯誤。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l dark:border-slate-700 shadow-xl transition-colors duration-300">
      <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Bot size={20} className="text-indigo-600 dark:text-indigo-400"/>
            AI 助手
        </h2>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setUseSearch(!useSearch)}
                className={`p-1.5 rounded-full transition-colors ${useSearch ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                title="切換 Google 搜尋"
            >
                <Search size={18} />
            </button>
            <button 
                onClick={onClose}
                className="p-1.5 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                title="關閉"
            >
                <X size={20} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                m.role === 'user' 
                    ? 'bg-indigo-600 text-white dark:bg-indigo-700' 
                    : 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-200'
            }`}>
              {m.text}
            </div>
            {m.grounding && m.grounding.length > 0 && (
                <div className="mt-2 text-xs bg-gray-50 dark:bg-slate-800 p-2 rounded border dark:border-slate-700 w-full">
                    <p className="font-semibold text-gray-500 dark:text-gray-400 mb-1">來源：</p>
                    <div className="flex flex-wrap gap-2">
                        {m.grounding.map((chunk, idx) => (
                           chunk.web?.uri ? (
                             <a key={idx} href={chunk.web.uri} target="_blank" rel="noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline truncate max-w-full block">
                                {chunk.web.title || chunk.web.uri}
                             </a>
                           ) : null
                        ))}
                    </div>
                </div>
            )}
          </div>
        ))}
        {isLoading && <Loader2 className="animate-spin text-gray-400" size={20} />}
        <div ref={endRef} />
      </div>

      <div className="p-4 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={useSearch ? "使用 Google 搜尋提問..." : "問我任何問題..."}
            className="flex-1 border dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
