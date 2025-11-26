import React, { useState, useEffect } from 'react';
import { CellData, MandalaChart, ViewMode, GridPosition, ChatMessage, FontSize } from './types';
import { suggestIdeas } from './services/geminiService';
import MandalaCell from './components/MandalaCell';
import ChatPanel from './components/ChatPanel';
import MediaPanel from './components/MediaPanel';
import { LayoutGrid, Sparkles, MessageSquare, Menu, ChevronLeft, ArrowLeft, Trash2, Type } from 'lucide-react';

const INITIAL_CELL: CellData = { id: '', text: '' };

const createEmptyChart = (): MandalaChart => ({
  mainGoal: { ...INITIAL_CELL, id: 'main', text: '' },
  subGoals: Array(8).fill(null).map((_, i) => ({ ...INITIAL_CELL, id: `sub-${i}` })),
  tasks: Array(8).fill(null).map((_, i) => 
    Array(8).fill(null).map((__, j) => ({ ...INITIAL_CELL, id: `task-${i}-${j}` }))
  )
});

// Mapping for 3x3 grid display
// 4 is Center. 
// 0, 1, 2 (Top Row)
// 3, 5    (Middle Row)
// 6, 7, 8 (Bottom Row)
const GRID_MAP = [0, 1, 2, 3, 4, 5, 6, 7, 8];
// Helper to map index 0-7 (SubGoals) to Grid Positions excluding 4
const OUTER_INDICES: GridPosition[] = [0, 1, 2, 5, 8, 7, 6, 3];

const App: React.FC = () => {
  const [data, setData] = useState<MandalaChart>(createEmptyChart());
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.MAIN);
  const [focusedSubGoalIndex, setFocusedSubGoalIndex] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ type: 'main' | 'sub' | 'task', index: number, subIndex?: number } | null>(null);
  
  const [showChat, setShowChat] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  // Chat State (Lifted)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: '你好！我是你的曼陀羅 AI 助手。今天有什麼我可以幫你規劃的嗎？' }
  ]);

  // --- Helpers to Get/Set Data ---

  const getCellData = (pos: number): CellData => {
    if (viewMode === ViewMode.MAIN) {
      if (pos === 4) return data.mainGoal;
      const subIndex = OUTER_INDICES.indexOf(pos as GridPosition);
      return subIndex !== -1 ? data.subGoals[subIndex] : INITIAL_CELL;
    } else {
      // SUB MODE
      if (focusedSubGoalIndex === null) return INITIAL_CELL;
      if (pos === 4) return data.subGoals[focusedSubGoalIndex];
      
      const taskIndex = OUTER_INDICES.indexOf(pos as GridPosition);
      return taskIndex !== -1 ? data.tasks[focusedSubGoalIndex][taskIndex] : INITIAL_CELL;
    }
  };

  const updateCell = (pos: number, updates: Partial<CellData>) => {
     setData(prev => {
       const next = { ...prev };
       if (viewMode === ViewMode.MAIN) {
          if (pos === 4) {
            next.mainGoal = { ...next.mainGoal, ...updates };
          } else {
            const idx = OUTER_INDICES.indexOf(pos as GridPosition);
            if (idx !== -1) next.subGoals[idx] = { ...next.subGoals[idx], ...updates };
          }
       } else {
          if (focusedSubGoalIndex === null) return next;
          if (pos === 4) {
             next.subGoals[focusedSubGoalIndex] = { ...next.subGoals[focusedSubGoalIndex], ...updates };
          } else {
             const tIdx = OUTER_INDICES.indexOf(pos as GridPosition);
             if (tIdx !== -1) next.tasks[focusedSubGoalIndex][tIdx] = { ...next.tasks[focusedSubGoalIndex][tIdx], ...updates };
          }
       }
       return next;
     });
  };

  // --- Actions ---

  const handleCellClick = (pos: number) => {
    if (viewMode === ViewMode.MAIN) {
      if (pos === 4) {
        setSelectedCell({ type: 'main', index: -1 });
      } else {
        const idx = OUTER_INDICES.indexOf(pos as GridPosition);
        // Double click logic or specific button to enter? Let's just select first.
        setSelectedCell({ type: 'sub', index: idx });
      }
    } else {
       if (pos === 4) {
          setSelectedCell({ type: 'sub', index: focusedSubGoalIndex! });
       } else {
          const idx = OUTER_INDICES.indexOf(pos as GridPosition);
          setSelectedCell({ type: 'task', index: idx, subIndex: focusedSubGoalIndex! });
       }
    }
  };

  const handleZoomIn = (pos: number) => {
     if (viewMode === ViewMode.MAIN && pos !== 4) {
        const idx = OUTER_INDICES.indexOf(pos as GridPosition);
        if (idx !== -1) {
            setFocusedSubGoalIndex(idx);
            setViewMode(ViewMode.SUB);
            setSelectedCell(null);
        }
     }
  };

  const handleBackToMain = () => {
    setViewMode(ViewMode.MAIN);
    setFocusedSubGoalIndex(null);
    setSelectedCell(null);
  };

  const handleClearAll = () => {
    if (window.confirm("確定要清除所有內容嗎？此動作無法復原。")) {
        setData(createEmptyChart());
        setViewMode(ViewMode.MAIN);
        setFocusedSubGoalIndex(null);
        setSelectedCell(null);
    }
  };

  const cycleFontSize = () => {
      if (fontSize === 'small') setFontSize('medium');
      else if (fontSize === 'medium') setFontSize('large');
      else setFontSize('small');
  };

  const handleSuggest = async () => {
    setIsSuggesting(true);
    try {
      // Prepare Chat Context (Use last 10 messages to provide recent context)
      const chatHistoryText = chatMessages
        .slice(-10) 
        .map(m => `${m.role === 'user' ? '使用者' : 'AI'}: ${m.text}`)
        .join('\n');

      if (viewMode === ViewMode.MAIN) {
        // Suggest SubGoals
        // We allow generating even if mainGoal text is empty IF there is chat history
        if (!data.mainGoal.text && chatHistoryText.length < 50) {
            alert("請先輸入核心目標，或先與 AI 助手討論您的想法。");
            setIsSuggesting(false);
            return;
        }

        const currentItems = data.subGoals.map(s => s.text).filter(Boolean);
        const ideas = await suggestIdeas(data.mainGoal.text || "未定義（請參考對話）", null, currentItems, chatHistoryText);
        
        setData(prev => {
            const next = { ...prev };
            ideas.forEach((idea, i) => {
                if (i < 8 && !next.subGoals[i].text) {
                    next.subGoals[i] = { ...next.subGoals[i], text: idea };
                }
            });
            return next;
        });

      } else {
        // Suggest Tasks for specific SubGoal
        if (focusedSubGoalIndex === null) return;
        const subGoal = data.subGoals[focusedSubGoalIndex];
        
        if (!subGoal.text && chatHistoryText.length < 50) {
             alert("請確保子目標有文字內容，或先與 AI 助手討論。");
             setIsSuggesting(false);
             return;
        }
        
        const currentItems = data.tasks[focusedSubGoalIndex].map(t => t.text).filter(Boolean);
        const ideas = await suggestIdeas(data.mainGoal.text, subGoal.text || "未定義", currentItems, chatHistoryText);

        setData(prev => {
            const next = { ...prev };
            ideas.forEach((idea, i) => {
                if (i < 8 && !next.tasks[focusedSubGoalIndex][i].text) {
                    next.tasks[focusedSubGoalIndex][i] = { ...next.tasks[focusedSubGoalIndex][i], text: idea };
                }
            });
            return next;
        });
      }
    } catch (e) {
      console.error(e);
      alert("AI 建議失敗。請檢查 API 金鑰或控制台。");
    } finally {
      setIsSuggesting(false);
    }
  };

  const getActiveCellForMedia = (): CellData => {
      if (!selectedCell) return INITIAL_CELL;
      if (selectedCell.type === 'main') return data.mainGoal;
      if (selectedCell.type === 'sub') return data.subGoals[selectedCell.index];
      if (selectedCell.type === 'task' && selectedCell.subIndex !== undefined) return data.tasks[selectedCell.subIndex][selectedCell.index];
      return INITIAL_CELL;
  };

  const updateActiveCellFromMedia = (updates: Partial<CellData>) => {
      if (!selectedCell) return;
      setData(prev => {
          const next = { ...prev };
          if (selectedCell.type === 'main') {
              next.mainGoal = { ...next.mainGoal, ...updates };
          } else if (selectedCell.type === 'sub') {
              next.subGoals[selectedCell.index] = { ...next.subGoals[selectedCell.index], ...updates };
          } else if (selectedCell.type === 'task' && selectedCell.subIndex !== undefined) {
              next.tasks[selectedCell.subIndex][selectedCell.index] = { ...next.tasks[selectedCell.subIndex][selectedCell.index], ...updates };
          }
          return next;
      });
  };

  // Toggle handlers that ensure mutually exclusive panels on smaller screens
  const toggleChat = () => {
    if (!showChat) setShowMedia(false);
    setShowChat(!showChat);
  };

  const toggleMedia = () => {
    if(!selectedCell) {
        alert("請先選擇一個格子以使用創意工具");
        return;
    }
    if (!showMedia) setShowChat(false);
    setShowMedia(!showMedia);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50">
      
      {/* Header */}
      <header className="h-14 md:h-16 bg-white border-b flex items-center justify-between px-2 md:px-6 shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-indigo-600 p-1.5 md:p-2 rounded-lg text-white">
            <LayoutGrid size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-gray-800 tracking-tight">
                <span className="hidden md:inline">曼陀羅思考法 AI</span>
                <span className="md:hidden">曼陀羅 AI</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
            {viewMode === ViewMode.SUB && (
                <button onClick={handleBackToMain} className="flex items-center gap-1 text-xs md:text-sm font-medium text-gray-600 hover:text-indigo-600 px-2 py-1.5 rounded-md hover:bg-gray-100 transition mr-1">
                    <ArrowLeft size={16} /> <span className="hidden md:inline">返回中心</span>
                </button>
            )}
            
            <div className="flex items-center border-r pr-1 mr-1 gap-1">
                 <button
                    onClick={cycleFontSize}
                    className="p-1.5 md:p-2 rounded-full text-gray-500 hover:bg-gray-100 transition"
                    title={`字體大小: ${fontSize === 'small' ? '小' : fontSize === 'medium' ? '中' : '大'}`}
                 >
                    <Type size={18} className="md:w-5 md:h-5" />
                 </button>
                 <button
                    onClick={handleClearAll}
                    className="p-1.5 md:p-2 rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                    title="清除所有內容"
                 >
                    <Trash2 size={18} className="md:w-5 md:h-5" />
                 </button>
            </div>

            <button 
                onClick={toggleChat}
                className={`p-1.5 md:p-2 rounded-full transition ${showChat ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}
                title="AI 助手"
            >
                <MessageSquare size={20} className="md:w-5 md:h-5" />
            </button>
            <button 
                onClick={toggleMedia}
                className={`p-1.5 md:p-2 rounded-full transition ${showMedia ? 'bg-purple-100 text-purple-600' : 'text-gray-500 hover:bg-gray-100'}`}
                title="創意工作室（圖像/影片）"
            >
                <Sparkles size={20} className="md:w-5 md:h-5" />
            </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Main Workspace */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
            
            {/* Toolbar - Floats over grid */}
            <div className="absolute top-2 md:top-4 left-1/2 transform -translate-x-1/2 z-10 flex gap-4 w-max pointer-events-none">
                <button 
                    onClick={handleSuggest}
                    disabled={isSuggesting}
                    className="pointer-events-auto flex items-center gap-2 bg-white/90 backdrop-blur border border-indigo-200 text-indigo-700 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm rounded-full shadow-lg hover:shadow-xl hover:bg-white transition disabled:opacity-50"
                >
                    <Sparkles size={14} className={isSuggesting ? "animate-spin" : ""} />
                    {isSuggesting ? "思考中..." : "AI 自動填寫"}
                </button>
            </div>

            {/* Grid Container */}
            <div className="flex-1 flex items-center justify-center p-2 bg-slate-50 w-full">
                {/* 
                   Responsive Grid Logic:
                   w-full max-w-[min(95vw, 75vh)] ensures it fits the viewport width OR height, whichever is tighter.
                   On desktop, we allow it to be max-w-2xl if space permits.
                */}
                <div className={`
                    relative 
                    w-full 
                    max-w-[min(95vw,75vh)] 
                    md:max-w-2xl 
                    aspect-square 
                    grid grid-cols-3 
                    gap-1 md:gap-3 lg:gap-4 
                    p-1 md:p-4 
                    bg-white rounded-lg md:rounded-xl shadow-xl border border-gray-100
                    transition-all duration-300
                `}>
                    {GRID_MAP.map((pos) => {
                        const cellData = getCellData(pos);
                        const isCenter = pos === 4;
                        
                        let isActive = false;
                        if (selectedCell) {
                            if (viewMode === ViewMode.MAIN) {
                                isActive = isCenter 
                                    ? selectedCell.type === 'main'
                                    : (selectedCell.type === 'sub' && OUTER_INDICES[selectedCell.index] === pos);
                            } else {
                                isActive = isCenter
                                    ? selectedCell.type === 'sub'
                                    : (selectedCell.type === 'task' && OUTER_INDICES[selectedCell.index] === pos);
                            }
                        }

                        return (
                            <div key={pos} className="relative w-full h-full">
                                <MandalaCell 
                                    data={cellData}
                                    isCenter={isCenter}
                                    isActive={isActive}
                                    fontSize={fontSize}
                                    onClick={() => handleCellClick(pos)}
                                    onEdit={(text) => updateCell(pos, { text })}
                                />
                                {!isCenter && viewMode === ViewMode.MAIN && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleZoomIn(pos);
                                        }}
                                        className="absolute bottom-1 right-1 p-0.5 md:p-1 bg-white/80 rounded-full shadow hover:bg-indigo-50 text-indigo-500 opacity-60 md:opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                        title="聚焦此區域"
                                    >
                                        <ChevronLeft size={14} className="rotate-180"/>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="pb-2 md:pb-4 text-center text-gray-400 text-xs md:text-sm shrink-0">
                {viewMode === ViewMode.MAIN ? "主總覽：定義你的核心目標" : `區域：${data.subGoals[focusedSubGoalIndex || 0].text || "未命名"}`}
            </div>
        </main>

        {/* Side Panels */}
        {showChat && (
            <div className="absolute right-0 top-0 bottom-0 md:relative w-full md:w-96 flex-shrink-0 z-30 transition-all duration-300 border-l border-gray-200">
                <div className="absolute top-2 right-2 md:hidden z-40">
                    <button onClick={() => setShowChat(false)} className="p-2 bg-gray-200 rounded-full text-gray-600 shadow-md">
                        <ChevronLeft />
                    </button>
                </div>
                <ChatPanel messages={chatMessages} onUpdateMessages={setChatMessages} />
            </div>
        )}
        
        {showMedia && selectedCell && (
            <div className="absolute right-0 top-0 bottom-0 md:relative w-full md:w-96 flex-shrink-0 z-30 transition-all duration-300 border-l border-gray-700">
                 <div className="absolute top-2 right-2 md:hidden z-40">
                    <button onClick={() => setShowMedia(false)} className="p-2 bg-gray-800 rounded-full text-gray-300 shadow-md">
                        <ChevronLeft />
                    </button>
                </div>
                <MediaPanel 
                    activeCell={getActiveCellForMedia()}
                    onUpdateCell={updateActiveCellFromMedia}
                    onClose={() => setShowMedia(false)}
                />
            </div>
        )}

      </div>
    </div>
  );
};

export default App;