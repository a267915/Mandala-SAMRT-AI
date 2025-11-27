
import React, { useState, useEffect, useRef } from 'react';
import { Target, X, Calendar, CheckCircle2, Circle, ChevronDown, ChevronRight, CheckSquare, Square, Repeat, Clock, CalendarDays } from 'lucide-react';
import { CellData, MandalaChart } from '../types';

interface GoalPanelProps {
  data: MandalaChart;
  onUpdateSubGoal: (index: number, updates: Partial<CellData>) => void;
  onUpdateTask: (subIndex: number, taskIndex: number, updates: Partial<CellData>) => void;
  onClose: () => void;
  activeFocus: { type: 'main' | 'sub' | 'task', index: number, subIndex?: number } | null;
}

const GoalPanel: React.FC<GoalPanelProps> = ({ data, onUpdateSubGoal, onUpdateTask, onClose, activeFocus }) => {
  const [expandedSubGoal, setExpandedSubGoal] = useState<number | null>(null);
  
  // Refs for scrolling to elements
  const subGoalRefs = useRef<(HTMLDivElement | null)[]>([]);
  const taskRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Auto-calculate progress for a sub-goal based on its tasks
  useEffect(() => {
      data.subGoals.forEach((sub, idx) => {
          const tasks = data.tasks[idx];
          const nonEmptyTasks = tasks.filter(t => t.text);
          if (nonEmptyTasks.length > 0) {
              const completedTasks = nonEmptyTasks.filter(t => t.isCompleted).length;
              const calcProgress = Math.round((completedTasks / nonEmptyTasks.length) * 100);
              
              if (calcProgress !== sub.progress) {
                  onUpdateSubGoal(idx, { progress: calcProgress });
              }
          }
      });
  }, [data.tasks]);

  // Sync with Active Focus from Main Grid
  useEffect(() => {
      if (!activeFocus) return;

      if (activeFocus.type === 'sub') {
          // Expand and scroll to SubGoal
          setExpandedSubGoal(activeFocus.index);
          setTimeout(() => {
              subGoalRefs.current[activeFocus.index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
      } else if (activeFocus.type === 'task' && activeFocus.subIndex !== undefined) {
          // Expand SubGoal parent first
          setExpandedSubGoal(activeFocus.subIndex);
          // Wait for accordion expansion then scroll to task
          setTimeout(() => {
              const key = `${activeFocus.subIndex}-${activeFocus.index}`;
              taskRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
      }
  }, [activeFocus]);

  const calculateTotalProgress = () => {
    const filledSubGoals = data.subGoals.filter(g => g.text);
    if (filledSubGoals.length === 0) return 0;
    const total = filledSubGoals.reduce((sum, g) => sum + (g.progress || 0), 0);
    return Math.round(total / filledSubGoals.length);
  };

  const totalProgress = calculateTotalProgress();

  const toggleExpand = (index: number) => {
      setExpandedSubGoal(expandedSubGoal === index ? null : index);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xl transition-colors duration-300">
      <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
        <div>
            <h3 className="font-semibold flex items-center gap-2 text-lg">
                <Target size={20} className="text-red-500" /> 
                目標進度追蹤
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                設定執行細項與頻率
            </p>
        </div>
        <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"/></button>
      </div>

      {/* Overall Progress */}
      <div className="p-6 bg-indigo-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
        <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200">總體達成率</span>
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
            <div 
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${totalProgress}%` }}
            ></div>
        </div>
      </div>

      {/* Sub Goals List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {data.subGoals.map((subGoal, index) => {
            const progress = subGoal.progress || 0;
            const isDone = progress === 100;
            const isExpanded = expandedSubGoal === index;
            
            // Check if this sub goal is currently focused in main grid
            const isFocused = activeFocus?.type === 'sub' && activeFocus.index === index;
            
            return (
                <div 
                    key={subGoal.id} 
                    ref={el => subGoalRefs.current[index] = el}
                    className={`
                        rounded-xl border transition-all duration-500 overflow-hidden
                        ${isDone ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700'}
                        ${isFocused ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-100 dark:shadow-none transform scale-[1.02]' : ''}
                    `}
                >
                    {/* Header / Summary */}
                    <div 
                        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 flex justify-between items-center"
                        onClick={() => toggleExpand(index)}
                    >
                        <div className="flex items-center gap-3 flex-1">
                             <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDone ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-400'}`}>
                                {index + 1}
                             </div>
                             <div className="flex-1">
                                <h4 className={`font-medium text-sm ${!subGoal.text ? 'text-gray-400 italic' : ''}`}>
                                    {subGoal.text || "未設定子目標"}
                                </h4>
                                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 mt-2">
                                    <div className={`h-1.5 rounded-full ${isDone ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                                </div>
                             </div>
                        </div>
                        <div className="ml-2 text-gray-400">
                             {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                    </div>

                    {/* Expanded Content: Task List */}
                    {isExpanded && (
                        <div className="bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 p-3 space-y-3">
                            <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">執行項目 (To-Do)</h5>
                            
                            {data.tasks[index].map((task, tIdx) => {
                                const hasText = !!task.text;
                                // Check if this task is focused
                                const isTaskFocused = activeFocus?.type === 'task' && activeFocus.subIndex === index && activeFocus.index === tIdx;
                                
                                return (
                                    <div 
                                        key={task.id} 
                                        ref={el => taskRefs.current[`${index}-${tIdx}`] = el}
                                        className={`
                                            flex flex-col gap-2 p-2 rounded transition-all duration-300
                                            border hover:border-gray-200 dark:hover:border-slate-600
                                            ${isTaskFocused 
                                                ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700 shadow-sm' 
                                                : 'border-transparent hover:bg-white dark:hover:bg-slate-800'
                                            }
                                        `}
                                    >
                                        <div className="flex items-start gap-2">
                                            <button 
                                                onClick={() => onUpdateTask(index, tIdx, { isCompleted: !task.isCompleted })}
                                                className={`mt-0.5 ${task.isCompleted ? 'text-green-500' : 'text-gray-300 dark:text-gray-600 hover:text-gray-400'}`}
                                            >
                                                {task.isCompleted ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </button>
                                            
                                            <div className="flex-1">
                                                <input 
                                                    type="text" 
                                                    value={task.text}
                                                    onChange={(e) => onUpdateTask(index, tIdx, { text: e.target.value })}
                                                    placeholder={`任務 ${tIdx + 1}`}
                                                    className={`w-full bg-transparent text-sm focus:outline-none ${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}
                                                />
                                            </div>
                                        </div>

                                        {/* Frequency & Settings Row */}
                                        {hasText && (
                                            <div className="pl-7 flex items-center gap-2">
                                                <select
                                                    value={task.frequency || 'one-time'}
                                                    onChange={(e) => onUpdateTask(index, tIdx, { frequency: e.target.value as any })}
                                                    className="text-xs bg-transparent border border-gray-200 dark:border-slate-600 rounded px-1 py-0.5 text-gray-500 focus:outline-none hover:bg-white dark:hover:bg-slate-700"
                                                >
                                                    <option value="one-time">一次性</option>
                                                    <option value="daily">每天</option>
                                                    <option value="weekly">每週</option>
                                                </select>

                                                {task.frequency === 'daily' && <Repeat size={12} className="text-orange-400" />}
                                                {task.frequency === 'weekly' && <CalendarDays size={12} className="text-blue-400" />}
                                                {task.frequency === 'one-time' && <Clock size={12} className="text-gray-300" />}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default GoalPanel;
