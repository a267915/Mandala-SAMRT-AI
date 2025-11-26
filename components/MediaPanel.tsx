import React, { useState } from 'react';
import { Image as ImageIcon, Wand2, Film, BrainCircuit, X, Upload } from 'lucide-react';
import { generateImage, editImage, generateVideo, analyzeImage } from '../services/geminiService';
import { CellData } from '../types';

interface MediaPanelProps {
  activeCell: CellData;
  onUpdateCell: (updates: Partial<CellData>) => void;
  onClose: () => void;
}

const MediaPanel: React.FC<MediaPanelProps> = ({ activeCell, onUpdateCell, onClose }) => {
  const [mode, setMode] = useState<'generate' | 'edit' | 'video' | 'analyze'>('generate');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Generation Options
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  
  // Analysis
  const [analysisResult, setAnalysisResult] = useState('');

  const handleAction = async () => {
    setLoading(true);
    setAnalysisResult('');
    
    try {
      if (mode === 'generate') {
        const fullPrompt = prompt || activeCell.text || "Abstract mandala art";
        const img = await generateImage(fullPrompt, aspectRatio, size);
        if (img) onUpdateCell({ imageUrl: img });
      } 
      else if (mode === 'edit') {
        if (!activeCell.imageUrl) return;
        const img = await editImage(activeCell.imageUrl, prompt);
        if (img) onUpdateCell({ imageUrl: img });
      }
      else if (mode === 'video') {
        // Use Veo
        // If we have an image, use it as start frame
        const vid = await generateVideo(
            prompt || activeCell.text || "Animation",
            aspectRatio === '9:16' ? '9:16' : '16:9',
            activeCell.imageUrl
        );
        if (vid) onUpdateCell({ videoUrl: vid });
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
           <Wand2 size={18} className="text-purple-400" /> 
           創意工作室
        </h3>
        <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-white"/></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button onClick={() => setMode('generate')} className={`flex-1 p-3 text-sm font-medium ${mode === 'generate' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}>
            <ImageIcon size={16} className="mx-auto mb-1"/> 生成
        </button>
        <button onClick={() => setMode('edit')} className={`flex-1 p-3 text-sm font-medium ${mode === 'edit' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}>
            <Wand2 size={16} className="mx-auto mb-1"/> 編輯
        </button>
        <button onClick={() => setMode('video')} className={`flex-1 p-3 text-sm font-medium ${mode === 'video' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}>
            <Film size={16} className="mx-auto mb-1"/> 影片
        </button>
        <button onClick={() => setMode('analyze')} className={`flex-1 p-3 text-sm font-medium ${mode === 'analyze' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400'}`}>
            <BrainCircuit size={16} className="mx-auto mb-1"/> 分析
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {/* Preview */}
        <div className="aspect-square bg-gray-800 rounded-lg mb-4 overflow-hidden relative border border-gray-700 flex items-center justify-center">
            {activeCell.videoUrl ? (
                <video src={activeCell.videoUrl} autoPlay loop muted className="w-full h-full object-cover" />
            ) : activeCell.imageUrl ? (
                <img src={activeCell.imageUrl} alt="preview" className="w-full h-full object-cover" />
            ) : (
                <div className="text-gray-500 text-xs text-center p-4">未選擇媒體。<br/> 請生成或上傳。</div>
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
                        mode === 'generate' ? "例如：一座充滿未來感的賽博龐克城市..." :
                        mode === 'edit' ? "例如：添加復古濾鏡..." :
                        mode === 'video' ? "例如：鏡頭緩慢平移..." :
                        "例如：這張圖片的主要顏色是什麼？"
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:border-purple-500 focus:outline-none h-20 resize-none"
                />
            </div>

            {mode !== 'analyze' && (
                <div className="grid grid-cols-2 gap-2">
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
                    {mode === 'generate' && (
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">尺寸</label>
                            <select 
                                value={size} 
                                onChange={e => setSize(e.target.value as any)}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
                            >
                                <option value="1K">1K</option>
                                <option value="2K">2K</option>
                                <option value="4K">4K</option>
                            </select>
                        </div>
                    )}
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
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-2 rounded shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
                {loading ? (
                    <span className="animate-spin">⏳</span> 
                ) : (
                    <>
                        {mode === 'generate' && "生成 (Pro Image)"}
                        {mode === 'edit' && "編輯 (Flash Image)"}
                        {mode === 'video' && "生成影片 (Veo)"}
                        {mode === 'analyze' && "分析 (Pro)"}
                    </>
                )}
            </button>

            {mode === 'video' && (
                <p className="text-xs text-gray-500 text-center">
                    注意：影片生成 (Veo) 需要付費 API 金鑰，可能需要幾分鐘時間。
                </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default MediaPanel;