import React from 'react';
import { CellData, FontSize } from '../types';
import { Image, Video, CheckCircle, Maximize2 } from 'lucide-react';

interface MandalaCellProps {
  data: CellData;
  isCenter: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  onEdit: (text: string) => void;
  isActive: boolean;
  highlight?: boolean;
  fontSize: FontSize;
}

const MandalaCell: React.FC<MandalaCellProps> = ({ 
  data, 
  isCenter, 
  onClick, 
  onDoubleClick,
  onEdit, 
  isActive, 
  highlight,
  fontSize
}) => {
  // Determine text size classes based on prop and isCenter
  const getTextSize = () => {
    switch (fontSize) {
      case 'small':
        return isCenter ? 'text-sm md:text-lg' : 'text-[10px] md:text-sm';
      case 'large':
        return isCenter ? 'text-lg md:text-3xl' : 'text-sm md:text-lg';
      case 'medium':
      default:
        return isCenter ? 'text-base md:text-xl' : 'text-xs md:text-base';
    }
  };

  return (
    <div 
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`
        relative flex flex-col items-center justify-center 
        p-1 md:p-2 
        text-center border cursor-pointer transition-all duration-300
        aspect-square overflow-hidden group rounded-md md:rounded-lg
        ${isCenter 
            ? 'bg-indigo-600 text-white shadow-lg z-10 dark:bg-indigo-700' 
            : 'bg-white text-gray-800 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700'
        }
        ${isActive 
            ? 'ring-2 md:ring-4 ring-indigo-300 z-20 dark:ring-indigo-500' 
            : 'border-gray-200 dark:border-slate-700'
        }
        ${highlight ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/30' : ''}
      `}
    >
      {/* Background Media */}
      {data.imageUrl && !data.videoUrl && (
        <img 
          src={data.imageUrl} 
          alt="cell-bg" 
          className={`absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity`}
        />
      )}
      {data.videoUrl && (
        <video 
          src={data.videoUrl}
          autoPlay loop muted
          className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity"
        />
      )}

      {/* Content */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {isCenter ? (
            <textarea
                value={data.text}
                onChange={(e) => onEdit(e.target.value)}
                placeholder="核心目標"
                className={`
                    bg-transparent text-white text-center font-bold 
                    w-full h-full resize-none focus:outline-none placeholder-indigo-300 
                    ${getTextSize()}
                    flex flex-col items-center justify-center
                    pt-[30%] md:pt-[30%]
                `}
            />
        ) : (
            <textarea
                value={data.text}
                onChange={(e) => onEdit(e.target.value)}
                placeholder="..."
                className={`
                    bg-transparent text-center font-medium 
                    w-full h-full resize-none focus:outline-none 
                    text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600
                    ${getTextSize()}
                    flex flex-col items-center justify-center
                    pt-[30%] md:pt-[35%]
                `}
            />
        )}
      </div>

      {/* Indicators */}
      <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1 flex space-x-0.5 md:space-x-1">
        {data.isCompleted && <CheckCircle size={12} className="text-green-500 md:w-4 md:h-4" />}
        {data.imageUrl && <Image size={12} className={`md:w-4 md:h-4 ${isCenter ? "text-indigo-200" : "text-gray-400 dark:text-gray-500"}`} />}
        {data.videoUrl && <Video size={12} className={`md:w-4 md:h-4 ${isCenter ? "text-indigo-200" : "text-gray-400 dark:text-gray-500"}`} />}
      </div>
      
      {/* Focus Hint (Only for main view outer cells that are not empty, as a subtle hint) */}
      {!isCenter && data.text && (
        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block pointer-events-none">
           <Maximize2 size={10} className="text-gray-400 dark:text-gray-500" /> 
        </div>
      )}
    </div>
  );
};

export default MandalaCell;
