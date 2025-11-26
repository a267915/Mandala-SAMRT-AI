import { GoogleGenAI, Type } from "@google/genai";

// Helper to get AI instance
// Note: We create a new instance per call to ensure latest API key if it changes (though usually env var is static in this context)
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses Gemini 3 Pro (Thinking Mode) to brainstorm ideas for the Mandala Chart.
 * Includes chat history context.
 */
export const suggestIdeas = async (
  mainContext: string,
  subContext: string | null,
  currentItems: string[],
  chatHistory: string = ""
): Promise<string[]> => {
  const ai = getAI();
  const isSubGoal = subContext !== null;
  
  let basePrompt = "";

  if (chatHistory) {
      basePrompt += `參考以下使用者與 AI 的對話紀錄，這對於理解使用者的意圖非常重要：\n\n---對話紀錄開始---\n${chatHistory}\n---對話紀錄結束---\n\n`;
  }

  basePrompt += isSubGoal
    ? `我正在填寫曼陀羅思考法（九宮格）。核心目標是「${mainContext}」。我目前專注於子目標「${subContext}」。
       請根據上述對話紀錄（如果有）以及目標內容，建議 8 個具體、可執行的任務或細節來達成「${subContext}」。`
    : `我正在填寫曼陀羅思考法（九宮格）。核心目標是「${mainContext}」。
       請根據上述對話紀錄（如果有）以及目標內容，建議 8 個不同的子目標或關鍵領域來達成此核心目標。`;

  basePrompt += `\n目前已有的項目：${currentItems.join(', ')}。請回傳剛好 8 個項目，並使用繁體中文。`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: basePrompt,
    config: {
      thinkingConfig: { thinkingBudget: 32768 }, // Thinking mode for deep reasoning
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ideas: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    }
  });

  const jsonText = response.text || "{}";
  try {
    const data = JSON.parse(jsonText);
    return data.ideas || [];
  } catch (e) {
    console.error("Failed to parse AI suggestion", e);
    return [];
  }
};

/**
 * Chat with Gemini (Pro) including Search Grounding.
 */
export const chatWithGemini = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  useSearch: boolean = false
) => {
  const ai = getAI();
  const tools = useSearch ? [{ googleSearch: {} }] : [];
  
  const chat = ai.chats.create({
    model: "gemini-3-pro-preview", // Use Pro for complex reasoning in chat
    history: history,
    config: {
      tools: tools,
    }
  });

  const result = await chat.sendMessage({ message });
  
  // Extract search grounding if available
  const grounding = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  return {
    text: result.text,
    grounding,
  };
};

/**
 * Generate an image using Nano Banana (Gemini 2.5 Flash Image).
 */
export const generateImage = async (
  prompt: string,
  aspectRatio: string = "1:1"
): Promise<string | null> => {
  const ai = getAI();
  
  try {
    // gemini-2.5-flash-image does not support imageSize, only aspectRatio
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Image generation failed", e);
  }
  return null;
};

/**
 * Edit an image using Gemini 2.5 Flash Image.
 */
export const editImage = async (
  base64Image: string,
  prompt: string
): Promise<string | null> => {
  const ai = getAI();
  // Strip header if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: "image/png" // Assuming PNG for simplicity or canvas export
            }
          },
          { text: prompt }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Image edit failed", e);
  }
  return null;
};

/**
 * Analyze an image using Gemini 2.5 Flash.
 */
export const analyzeImage = async (base64Image: string, prompt: string): Promise<string> => {
    const ai = getAI();
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    
    // Using Flash for faster, lighter analysis
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
            parts: [
                { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
                { text: prompt }
            ]
        }
    });
    return response.text || "無法取得分析結果。";
}