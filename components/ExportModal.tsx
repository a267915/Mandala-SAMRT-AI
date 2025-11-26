import React, { useState } from 'react';
import { Download, FileText, Image as ImageIcon, FileJson, Upload, X, FileType } from 'lucide-react';
import { MandalaChart } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ExportModalProps {
  data: MandalaChart;
  onImport: (data: MandalaChart) => void;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ data, onImport, onClose }) => {
  const [loading, setLoading] = useState(false);

  // Helper: Get Current Date String
  const getDateStr = () => new Date().toISOString().split('T')[0];
  const getFileName = (ext: string) => `mandala-${data.mainGoal.text || 'untitled'}-${getDateStr()}.${ext}`;

  // 1. Export as JSON
  const handleExportJSON = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = getFileName('json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Export as Text
  const handleExportText = () => {
    let content = `曼陀羅思考法 - 核心目標：${data.mainGoal.text || '未定義'}\n`;
    content += `日期：${getDateStr()}\n\n`;
    content += `================================\n\n`;

    data.subGoals.forEach((sub, i) => {
      if (!sub.text && data.tasks[i].every(t => !t.text)) return; // Skip empty sections

      content += `[區域 ${i + 1}] 子目標：${sub.text || '(未填寫)'}\n`;
      data.tasks[i].forEach((task, j) => {
        if (task.text) {
          content += `  - ${task.text}\n`;
        }
      });
      content += `\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = getFileName('txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Export as Image (PNG)
  const handleExportImage = async () => {
    const element = document.getElementById('mandala-grid');
    if (!element) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution
        backgroundColor: null, // Transparent background if possible, or use current theme bg
        useCORS: true, // Allow cross-origin images if any
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = getFileName('png');
      link.click();
    } catch (error) {
      console.error("Export image failed", error);
      alert("匯出圖片失敗，請重試。");
    } finally {
      setLoading(false);
    }
  };

  // 4. Export as PDF
  const handleExportPDF = async () => {
    const element = document.getElementById('mandala-grid');
    if (!element) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate image size to fit page while maintaining aspect ratio
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = imgProps.width;
      const imgHeight = imgProps.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight) * 0.9; // 90% fit
      
      const newWidth = imgWidth * ratio;
      const newHeight = imgHeight * ratio;
      
      const x = (pdfWidth - newWidth) / 2;
      const y = (pdfHeight - newHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, newWidth, newHeight);
      pdf.save(getFileName('pdf'));
    } catch (error) {
      console.error("Export PDF failed", error);
      alert("匯出 PDF 失敗，請重試。");
    } finally {
      setLoading(false);
    }
  };

  // 5. Import JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Basic validation
        if (json.mainGoal && Array.isArray(json.subGoals) && Array.isArray(json.tasks)) {
          onImport(json);
          onClose();
        } else {
          alert("無效的檔案格式。請確保匯入的是本應用程式產生的 JSON 檔案。");
        }
      } catch (err) {
        console.error(err);
        alert("讀取檔案失敗。");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Download size={20} className="text-indigo-600 dark:text-indigo-400"/>
            匯入 / 匯出
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
            
            {/* Export Section */}
            <div>
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">匯出內容</h4>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleExportImage} disabled={loading} className="flex flex-col items-center justify-center p-4 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-gray-200 dark:border-slate-700 transition group">
                        <ImageIcon size={24} className="mb-2 text-purple-500 group-hover:scale-110 transition-transform"/>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">圖片 (PNG)</span>
                    </button>
                    <button onClick={handleExportPDF} disabled={loading} className="flex flex-col items-center justify-center p-4 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-gray-200 dark:border-slate-700 transition group">
                        <FileType size={24} className="mb-2 text-red-500 group-hover:scale-110 transition-transform"/>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">文件 (PDF)</span>
                    </button>
                    <button onClick={handleExportText} disabled={loading} className="flex flex-col items-center justify-center p-4 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-gray-200 dark:border-slate-700 transition group">
                        <FileText size={24} className="mb-2 text-blue-500 group-hover:scale-110 transition-transform"/>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">文字檔 (TXT)</span>
                    </button>
                    <button onClick={handleExportJSON} disabled={loading} className="flex flex-col items-center justify-center p-4 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-gray-200 dark:border-slate-700 transition group">
                        <FileJson size={24} className="mb-2 text-orange-500 group-hover:scale-110 transition-transform"/>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">備份 (JSON)</span>
                    </button>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t dark:border-slate-700"></div>

            {/* Import Section */}
            <div>
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">還原進度</h4>
                <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 bg-gray-50 dark:bg-slate-800/50 transition">
                    <div className="flex flex-col items-center">
                        <Upload size={24} className="text-gray-400 mb-2"/>
                        <span className="text-sm text-gray-600 dark:text-gray-300">點擊匯入 JSON 檔案</span>
                    </div>
                    <input type="file" className="hidden" accept=".json" onChange={handleFileChange} />
                </label>
            </div>
        </div>

        {/* Loading Overlay */}
        {loading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center z-10">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                    <span className="text-sm font-medium text-indigo-600">處理中...</span>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ExportModal;
