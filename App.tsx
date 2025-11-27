
import React, { useState, useEffect } from 'react';
import { CellData, MandalaChart, ViewMode, GridPosition, ChatMessage, FontSize, Theme } from './types';
import { suggestIdeas } from './services/geminiService';
import MandalaCell from './components/MandalaCell';
import ChatPanel from './components/ChatPanel';
import MediaPanel from './components/MediaPanel';
import ExportModal from './components/ExportModal';
import GoalPanel from './components/GoalPanel';
import { LayoutGrid, Sparkles, MessageSquare, Menu, ChevronLeft, ArrowLeft, Trash2, Type, Maximize2, Bot, Sun, Moon, Share2, ZoomIn, Target } from 'lucide-react';

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
  const [showGoals, setShowGoals] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [theme, setTheme] = useState<Theme>('light');

  // Chat State (Lifted)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: '你好！我是你的曼陀羅 AI 助手。今天有什麼我可以幫你規劃的嗎？' }
  ]);

  // Handle Theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

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
       // Deep copy needed for reliable updates, though shallow copy of arrays often works in React if reference changes
       // Using shallow copy of arrays for better safety
       const next = { ...prev };
       next.subGoals = [...prev.subGoals];
       next.tasks = [...prev.tasks]; // Shallow copy of the array of arrays
       
       if (viewMode === ViewMode.MAIN) {
          if (pos === 4) {
            next.mainGoal = { ...next.mainGoal, ...updates };
          } else {
            const idx = OUTER_INDICES.indexOf(pos as GridPosition);
            if (idx !== -1) next.subGoals[idx] = { ...next.subGoals[idx], ...updates };
          }
       } else {
          if (focusedSubGoalIndex === null) return next;
          // IMPORTANT: Need to clone the specific task array before modifying
          next.tasks[focusedSubGoalIndex] = [...next.tasks[focusedSubGoalIndex]];

          if (pos === 4) {
             next.subGoals[focusedSubGoalIndex] = { ...next.subGoals[focusedSubGoalIndex], ...updates };
          } else {
             const tIdx = OUTER_INDICES.indexOf(pos as GridPosition);
             if (tIdx !== -1) {
                // Update the task
                next.tasks[focusedSubGoalIndex][tIdx] = { ...next.tasks[focusedSubGoalIndex][tIdx], ...updates };
                
                // Recalculate progress for this sub-goal
                const tasks = next.tasks[focusedSubGoalIndex];
                const nonEmptyTasks = tasks.filter(t => t.text);
                if (nonEmptyTasks.length > 0) {
                    const completedTasks = nonEmptyTasks.filter(t => t.isCompleted).length;
                    const newProgress = Math.round((completedTasks / nonEmptyTasks.length) * 100);
                    next.subGoals[focusedSubGoalIndex] = { ...next.subGoals[focusedSubGoalIndex], progress: newProgress };
                }
             }
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

  const handleCellDoubleClick = (pos: number) => {
    if (viewMode === ViewMode.MAIN) {
        // Double click outer cell -> Enter it
        if (pos !== 4) {
            handleZoomIn(pos);
        }
    } else if (viewMode === ViewMode.SUB) {
        // Double click center cell -> Go back
        if (pos === 4) {
            handleBackToMain();
        }
    }
  };

  const handleClearCurrentView = () => {
    if (viewMode === ViewMode.MAIN) {
        if (window.confirm("確定要清除所有內容（包含所有子目標與任務）嗎？此動作無法復原。")) {
            setData(createEmptyChart());
            // No change to viewMode, stay in MAIN
            setFocusedSubGoalIndex(null);
            setSelectedCell(null);
        }
    } else if (viewMode === ViewMode.SUB && focusedSubGoalIndex !== null) {
        if (window.confirm("確定要清除此頁面（此子目標及其所有任務）的內容嗎？")) {
            setData(prev => ({
                ...prev,
                // Use immutable map to replace the specific subGoal
                subGoals: prev.subGoals.map((sub, idx) => 
                    idx === focusedSubGoalIndex 
                        ? { ...INITIAL_CELL, id: `sub-${idx}` } 
                        : sub
                ),
                // Use immutable map to replace the specific task array
                tasks: prev.tasks.map((tasksGroup, idx) => 
                    idx === focusedSubGoalIndex
                        ? Array(8).fill(null).map((_, j) => ({ ...INITIAL_CELL, id: `task-${idx}-${j}` }))
                        : tasksGroup
                )
            }));
            setSelectedCell(null);
        }
    }
  };

  const handleImportData = (importedData: MandalaChart) => {
      if (window.confirm("匯入將會覆蓋目前的內容，確定要繼續嗎？")) {
          setData(importedData);
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
        if (!data.mainGoal.text && chatHistoryText.length < 50) {
            alert("請先輸入核心目標，或先與 AI 助手討論您的想法。");
            setIsSuggesting(false);
            return;
        }

        const currentItems = data.subGoals.map(s => s.text).filter(Boolean);
        const ideas = await suggestIdeas(data.mainGoal.text || "未定義（請參考對話）", null, currentItems, chatHistoryText);
        
        setData(prev => {
            const next = { ...prev, subGoals: [...prev.subGoals] };
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
            const next = { ...prev, tasks: [...prev.tasks] };
            next.tasks[focusedSubGoalIndex] = [...next.tasks[focusedSubGoalIndex]];
            
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
          const next = { ...prev, subGoals: [...prev.subGoals], tasks: [...prev.tasks] };
          
          if (selectedCell.type === 'main') {
              next.mainGoal = { ...next.mainGoal, ...updates };
          } else if (selectedCell.type === 'sub') {
              next.subGoals[selectedCell.index] = { ...next.subGoals[selectedCell.index], ...updates };
          } else if (selectedCell.type === 'task' && selectedCell.subIndex !== undefined) {
              next.tasks[selectedCell.subIndex] = [...next.tasks[selectedCell.subIndex]];
              next.tasks[selectedCell.subIndex][selectedCell.index] = { ...next.tasks[selectedCell.subIndex][selectedCell.index], ...updates };
          }
          return next;
      });
  };
  
  const updateSubGoalFromGoalPanel = (index: number, updates: Partial<CellData>) => {
      setData(prev => {
          const next = { ...prev, subGoals: [...prev.subGoals] };
          next.subGoals[index] = { ...next.subGoals[index], ...updates };
          return next;
      });
  };

  const updateTaskFromGoalPanel = (subIndex: number, taskIndex: number, updates: Partial<CellData>) => {
      setData(prev => {
          const next = { ...prev, subGoals: [...prev.subGoals], tasks: [...prev.tasks] };
          next.tasks[subIndex] = [...next.tasks[subIndex]];
          
          // 1. Update the specific task
          next.tasks[subIndex][taskIndex] = { ...next.tasks[subIndex][taskIndex], ...updates };
          
          // 2. Recalculate progress for the parent SubGoal
          const tasks = next.tasks[subIndex];
          const nonEmptyTasks = tasks.filter(t => t.text);
          if (nonEmptyTasks.length > 0) {
              const completedTasks = nonEmptyTasks.filter(t => t.isCompleted).length;
              const newProgress = Math.round((completedTasks / nonEmptyTasks.length) * 100);
              next.subGoals[subIndex] = { ...next.subGoals[subIndex], progress: newProgress };
          } else {
             next.subGoals[subIndex] = { ...next.subGoals[subIndex], progress: 0 };
          }
          
          return next;
      });
  };

  // Toggle handlers that ensure mutually exclusive panels on smaller screens
  const toggleChat = () => {
    if (!showChat) {
        setShowMedia(false);
        setShowGoals(false);
    }
    setShowChat(!showChat);
  };

  const toggleMedia = () => {
    if(!selectedCell) {
        alert("請先選擇一個格子以使用創意工具");
        return;
    }
    if (!showMedia) {
        setShowChat(false);
        setShowGoals(false);
    }
    setShowMedia(!showMedia);
  };
  
  const toggleGoals = () => {
    if (!showGoals) {
        setShowChat(false);
        setShowMedia(false);
    }
    setShowGoals(!showGoals);
  };
  
  // Close all panels helper
  const closeAllPanels = () => {
      setShowChat(false);
      setShowMedia(false);
      setShowGoals(false);
  };

  const isAnyPanelOpen = showChat || showMedia || showGoals;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Header */}
      <header className="h-14 md:h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-700 flex items-center justify-between px-2 md:px-6 shadow-sm z-20 shrink-0 transition-colors duration-300 relative">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-indigo-600 dark:bg-indigo-700 p-1.5 md:p-2 rounded-lg text-white">
            <LayoutGrid size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white tracking-tight">
                <span className="hidden md:inline">曼陀羅思考法 AI</span>
                <span className="md:hidden">曼陀羅 AI</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
            {viewMode === ViewMode.SUB && (
                <button onClick={handleBackToMain} className="flex items-center gap-1 text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition mr-1">
                    <ArrowLeft size={16} /> <span className="hidden md:inline">返回中心</span>
                </button>
            )}
            
            <div className="flex items-center border-r dark:border-slate-700 pr-1 mr-1 gap-1">
                 <button
                    onClick={cycleFontSize}
                    className="p-1.5 md:p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                    title={`字體大小: ${fontSize === 'small' ? '小' : fontSize === 'medium' ? '中' : '大'}`}
                 >
                    <Type size={18} className="md:w-5 md:h-5" />
                 </button>
                 <button
                    onClick={toggleTheme}
                    className="p-1.5 md:p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                    title={theme === 'light' ? "切換至深色模式" : "切換至亮色模式"}
                 >
                    {theme === 'light' ? <Moon size={18} className="md:w-5 md:h-5" /> : <Sun size={18} className="md:w-5 md:h-5" />}
                 </button>
                 
                 <button
                    onClick={() => setShowExport(true)}
                    className="p-1.5 md:p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                    title="匯出 / 匯入 / 分享"
                 >
                    <Share2 size={18} className="md:w-5 md:h-5" />
                 </button>

                 <button
                    onClick={handleClearCurrentView}
                    className="p-1.5 md:p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition"
                    title={viewMode === ViewMode.MAIN ? "清除所有內容" : "清除本頁內容"}
                 >
                    <Trash2 size={18} className="md:w-5 md:h-5" />
                 </button>
            </div>
            
            <button 
                onClick={toggleGoals}
                className={`p-1.5 md:p-2 rounded-full transition ${showGoals ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                title="目標進度追蹤"
            >
                <Target size={20} className="md:w-5 md:h-5" />
            </button>

            <button 
                onClick={toggleChat}
                className={`
                    flex items-center gap-2
                    p-2 md:px-4 md:py-2 rounded-full transition-all duration-300
                    ${showChat 
                        ? 'bg-indigo-800 text-white shadow-inner ring-2 ring-indigo-300 dark:ring-indigo-500' 
                        : 'bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                    }
                `}
                title="AI 助手"
            >
                <Bot size={20} className="md:w-5 md:h-5" />
                <span className="hidden md:inline text-sm font-semibold">AI 助手</span>
            </button>

            <button 
                onClick={toggleMedia}
                className={`p-1.5 md:p-2 rounded-full transition ${showMedia ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
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
                    className="pointer-events-auto flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm rounded-full shadow-lg hover:shadow-xl hover:bg-white dark:hover:bg-slate-800 transition disabled:opacity-50"
                >
                    <Sparkles size={14} className={isSuggesting ? "animate-spin" : ""} />
                    {isSuggesting ? "思考中..." : "AI 自動填寫"}
                </button>
            </div>

            {/* Grid Container */}
            <div className="flex-1 flex items-center justify-center p-2 bg-slate-50 dark:bg-slate-950 w-full transition-colors duration-300">
                <div 
                    id="mandala-grid" 
                    className={`
                    relative 
                    w-full 
                    max-w-[min(95vw,75vh)] 
                    md:max-w-2xl 
                    aspect-square 
                    grid grid-cols-3 
                    gap-1 md:gap-3 lg:gap-4 
                    p-1 md:p-4 
                    bg-white dark:bg-slate-800
                    rounded-lg md:rounded-xl shadow-xl border border-gray-100 dark:border-slate-700
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
                                    onDoubleClick={() => handleCellDoubleClick(pos)}
                                    onEdit={(text) => updateCell(pos, { text })}
                                />
                                
                                {!isCenter && viewMode === ViewMode.MAIN && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleZoomIn(pos);
                                        }}
                                        className="absolute bottom-1 right-1 md:bottom-2 md:right-2 p-1.5 md:p-2 bg-indigo-50 dark:bg-slate-700 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 shadow-md transition-all z-30 hover:scale-110 border border-indigo-100 dark:border-slate-600"
                                        title="進入子目標"
                                    >
                                        <ZoomIn size={18} className="w-4 h-4 md:w-5 md:h-5" />
                                    </button>
                                )}

                                {isCenter && viewMode === ViewMode.SUB && (
                                     <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleBackToMain();
                                        }}
                                        className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 bg-white text-indigo-700 rounded-full shadow-lg hover:bg-gray-100 transition-all z-30 hover:scale-105"
                                        title="返回中心"
                                    >
                                        <ArrowLeft size={16} />
                                        <span className="text-xs font-bold">返回</span>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
        
        {/* Backdrop for closing panels (Desktop/Mobile) */}
        {isAnyPanelOpen && (
             <div 
                className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-25 transition-opacity duration-300"
                onClick={closeAllPanels}
             />
        )}

        {/* Side Panels */}
        <div className={`
            fixed inset-y-0 right-0 z-30 
            w-full md:w-80 lg:w-96 
            transform transition-transform duration-300 ease-in-out shadow-2xl
            ${showChat ? 'translate-x-0' : 'translate-x-full'}
        `}>
            {showChat && (
                <div className="h-full w-full">
                    <ChatPanel 
                        messages={chatMessages} 
                        onUpdateMessages={setChatMessages} 
                        onClose={() => setShowChat(false)}
                    />
                </div>
            )}
        </div>
        
        <div className={`
            fixed inset-y-0 right-0 z-30 
            w-full md:w-80 lg:w-96 
            transform transition-transform duration-300 ease-in-out shadow-2xl
            ${showGoals ? 'translate-x-0' : 'translate-x-full'}
        `}>
             {showGoals && (
                <div className="h-full w-full">
                    <GoalPanel 
                        data={data}
                        onUpdateSubGoal={updateSubGoalFromGoalPanel}
                        onUpdateTask={updateTaskFromGoalPanel}
                        onClose={() => setShowGoals(false)}
                        activeFocus={selectedCell}
                    />
                </div>
            )}
        </div>

        <div className={`
            fixed inset-y-0 right-0 z-30 
            w-full md:w-80 lg:w-96 
            transform transition-transform duration-300 ease-in-out shadow-2xl
            ${showMedia ? 'translate-x-0' : 'translate-x-full'}
        `}>
             {showMedia && (
                <div className="h-full w-full">
                    <MediaPanel 
                        activeCell={getActiveCellForMedia()} 
                        onUpdateCell={updateActiveCellFromMedia} 
                        onClose={() => setShowMedia(false)} 
                    />
                </div>
            )}
        </div>

      </div>

      {/* Export Modal */}
      {showExport && (
        <ExportModal 
            data={data} 
            onImport={handleImportData} 
            onClose={() => setShowExport(false)} 
        />
      )}

    </div>
  );
};

export default App;
