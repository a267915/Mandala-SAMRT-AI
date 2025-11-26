import React, { useState, useRef, useEffect } from 'react';
import { Send, Search, Bot, Loader2 } from 'lucide-react';
import { chatWithGemini } from '../services/geminiService';
import { ChatMessage } from '../types';

interface ChatPanelProps {
    messages: ChatMessage[];
    onUpdateMessages: (newMessages: ChatMessage[]) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onUpdateMessages }) => {
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
    <div className="flex flex-col h-full bg-white border-l shadow-xl">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Bot size={20} className="text-indigo-600"/>
            AI 助手
        </h2>
        <button 
            onClick={() => setUseSearch(!useSearch)}
            className={`p-1.5 rounded-full transition-colors ${useSearch ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-200'}`}
            title="切換 Google 搜尋"
        >
            <Search size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-lg text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
              {m.text}
            </div>
            {m.grounding && m.grounding.length > 0 && (
                <div className="mt-2 text-xs bg-gray-50 p-2 rounded border w-full">
                    <p className="font-semibold text-gray-500 mb-1">來源：</p>
                    <div className="flex flex-wrap gap-2">
                        {m.grounding.map((chunk, idx) => (
                           chunk.web?.uri ? (
                             <a key={idx} href={chunk.web.uri} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline truncate max-w-full block">
                                {chunk.web.title || chunk.web.uri}
                             </a>
                           ) : null
                        ))}
                    </div>
                </div>
            )}
          </div>
        ))}
        {isLoading && <Loader2 className="animate-spin text-gray-400 ml-4" size={20} />}
        <div ref={endRef} />
      </div>

      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={useSearch ? "使用 Google 搜尋提問..." : "問我任何問題..."}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading}
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;