export interface CellData {
  id: string;
  text: string;
  notes?: string;
  imageUrl?: string;
  videoUrl?: string; // Kept for backward compatibility if data exists, but not generating new ones
  isCompleted?: boolean;
}

export interface MandalaChart {
  mainGoal: CellData;
  subGoals: CellData[]; // 8 items
  tasks: CellData[][]; // 8 arrays of 8 items each
}

// Maps to the 3x3 grid indices visually
// 0 1 2
// 3 4 5
// 6 7 8
// 4 is always the center
export type GridPosition = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export enum ViewMode {
  MAIN = 'MAIN', // Viewing the central 3x3 (Main Goal + Sub Goals)
  SUB = 'SUB',   // Viewing a specific Sub Goal's 3x3 (Sub Goal + Tasks)
}

export type GeminiModel = 
  | 'gemini-2.5-flash' 
  | 'gemini-3-pro-preview' 
  | 'gemini-2.5-flash-image';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  grounding?: any[];
}

export type FontSize = 'small' | 'medium' | 'large';