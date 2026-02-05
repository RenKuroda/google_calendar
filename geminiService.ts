
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAIResponse = async (userMessage: string, history: { role: 'user' | 'assistant', content: string }[]) => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, // Low temperature for factual scheduling tasks
      },
    });

    // We send history for context, though for simple schedule lookups it might be overkill
    // but useful for follow-up questions like "じゃあその次の日は？"
    let response;
    if (history.length > 0) {
      // In this specific task, we might just want to send the full message history
      // or just the latest if it's a stateless lookup. Let's send the latest for now 
      // as part of a chat session.
      for (const h of history) {
        await chat.sendMessage({ message: h.content });
      }
    }
    
    response = await chat.sendMessage({ message: userMessage });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "申し訳ありません。カレンダーデータの取得中にエラーが発生しました。";
  }
};
