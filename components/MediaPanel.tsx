import React, { useState } from 'react';
import { Image as ImageIcon, Wand2, BrainCircuit, X, Upload } from 'lucide-react';
import { generateImage, editImage, analyzeImage } from '../services/geminiService';
import { CellData } from '../types';

interface MediaPanelProps {
  activeCell: CellData;
  onUpdateCell: (updates: Partial<CellData>) => void;
  onClose: () => void;
}

const MediaPanel: React.FC<MediaPanelProps> = ({ activeCell, onUpdateCell, onClose }) => {
  const [mode, setMode] = useState<'generate' | 'edit' | 'analyze'>('generate');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Generation Options
  const [aspectRatio, setAspectRatio] = useState('1:1');
  
  // Analysis
  const [analysisResult, setAnalysisResult] = useState('');

  const handleAction = async () => {
    setLoading(true);
    setAnalysisResult('');
    
    try {
      if (mode === 'generate') {
        const fullPrompt = prompt || activeCell.text || "Abstract mandala art";
        const img = await generateImage(fullPrompt, aspectRatio);
        if (img) onUpdateCell({ imageUrl: img });
      } 
      else if (mode === 'edit') {
        if (!activeCell.imageUrl) return;
        const img = await editImage(activeCell.imageUrl, prompt);
        if (img) onUpdateCell({ imageUrl: img });
      }
      else if (mode === 'analyze') {
        if (!activeCell.imageUrl) return;
        const text = await analyzeImage(activeCell.imageUrl, prompt || "這張圖片裡有什麼？");
        setAnalysisResult(text);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              onUpdateCell({ imageUrl: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white shadow-xl">
      <div className="p-4 flex justify-between items-center border-b border-gray-700">
        <h3 className="font-semibold flex items-center gap-2">
           <Wand2 size={18} className="text-yellow-400" /> 
           創意工作室 (Nano)
        </h3>
        <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-white"/></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button onClick={() => setMode('generate')} className={`flex-1 p-3 text-sm font-medium ${mode === 'generate' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400'}`}>
            <ImageIcon size={16} className="mx-auto mb-1"/> 生成
        </button>
        <button onClick={() => setMode('edit')} className={`flex-1 p-3 text-sm font-medium ${mode === 'edit' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400'}`}>
            <Wand2 size={16} className="mx-auto mb-1"/> 編輯
        </button>
        <button onClick={() => setMode('analyze')} className={`flex-1 p-3 text-sm font-medium ${mode === 'analyze' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400'}`}>
            <BrainCircuit size={16} className="mx-auto mb-1"/> 分析
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {/* Preview */}
        <div className="aspect-square bg-gray-800 rounded-lg mb-4 overflow-hidden relative border border-gray-700 flex items-center justify-center">
            {activeCell.imageUrl ? (
                <img src={activeCell.imageUrl} alt="preview" className="w-full h-full object-cover" />
            ) : (
                <div className="text-gray-500 text-xs text-center p-4">未選擇圖片。<br/> 請生成或上傳。</div>
            )}
            
            <label className="absolute bottom-2 right-2 bg-gray-900/80 p-2 rounded-full cursor-pointer hover:bg-black transition">
                <Upload size={14} />
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </label>
        </div>

        {/* Controls */}
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                    {mode === 'analyze' ? '問題' : '提示詞'}
                </label>
                <textarea 
                    value={prompt} 
                    onChange={e => setPrompt(e.target.value)}
                    placeholder={
                        mode === 'generate' ? "例如：一隻在太空中的貓 (Nano Banana)..." :
                        mode === 'edit' ? "例如：添加復古濾鏡..." :
                        "例如：這張圖片的主要顏色是什麼？"
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:border-yellow-500 focus:outline-none h-20 resize-none"
                />
            </div>

            {mode !== 'analyze' && (
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">長寬比</label>
                    <select 
                        value={aspectRatio} 
                        onChange={e => setAspectRatio(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
                    >
                        <option value="1:1">1:1 (正方形)</option>
                        <option value="16:9">16:9 (橫向)</option>
                        <option value="9:16">9:16 (直向)</option>
                        <option value="4:3">4:3</option>
                        <option value="3:4">3:4</option>
                    </select>
                </div>
            )}
            
            {mode === 'analyze' && analysisResult && (
                <div className="bg-gray-800 p-3 rounded text-sm text-gray-300 border border-gray-700">
                    <h4 className="font-bold text-white mb-1">分析結果：</h4>
                    {analysisResult}
                </div>
            )}

            <button 
                onClick={handleAction}
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-medium py-2 rounded shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
                {loading ? (
                    <span className="animate-spin">⏳</span> 
                ) : (
                    <>
                        {mode === 'generate' && "生成 (Nano Banana)"}
                        {mode === 'edit' && "編輯 (Flash Image)"}
                        {mode === 'analyze' && "分析 (Flash)"}
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default MediaPanel;