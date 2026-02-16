import { GoogleGenAI, Chat } from "@google/genai";
import { buildInstruction } from "../constants";
import { ChatMood, ChatLanguage } from "../types";

let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;
let currentInstruction: string = '';
let currentMood: ChatMood = 'FUNNY';
let currentLanguage: ChatLanguage = 'EN';
let currentUsername: string = '';

const getGenAI = (): GoogleGenAI => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return genAI;
};

export const initializeChatSession = async (
  instruction: string,
  mood?: ChatMood,
  language?: ChatLanguage,
  username?: string
): Promise<void> => {
  const ai = getGenAI();

  if (mood) currentMood = mood;
  if (language) currentLanguage = language;
  if (username) currentUsername = username;

  currentInstruction = (mood && language && username)
    ? buildInstruction(mood, language, username)
    : instruction;

  chatSession = ai.chats.create({
    model: "gemini-1.5-flash",
    config: {
      systemInstruction: currentInstruction,
      temperature: currentMood === 'FACTCHECK' ? 0.2 : currentMood === 'CHILL' ? 0.7 : 1.1,
      topP: 0.95,
      topK: 64,
    },
  });
};

/**
 * Primary: try streaming first, fall back to standard if streaming fails.
 * onChunk receives accumulated text for real-time display.
 */
export const sendMessageStreaming = async (
  message: string,
  onChunk: (accumulated: string) => void
): Promise<string> => {
  if (!chatSession) {
    await initializeChatSession(currentInstruction || '', currentMood, currentLanguage, currentUsername);
  }
  if (!chatSession) throw new Error("Failed to initialize chat session");

  try {
    const stream = await chatSession.sendMessageStream({ message });
    let accumulated = '';

    for await (const chunk of stream) {
      const text = chunk.text || '';
      if (text) {
        accumulated += text;
        onChunk(accumulated);
      }
    }

    if (!accumulated) {
      // Stream returned empty — fallback
      const fallback = await sendMessageToGemini(message);
      onChunk(fallback);
      return fallback;
    }

    return accumulated;
  } catch (error) {
    console.warn("Streaming failed, falling back to standard:", error);
    try {
      const fallback = await sendMessageToGemini(message);
      onChunk(fallback);
      return fallback;
    } catch (fallbackError) {
      const errMsg = "⚡ Connection hiccup... try again!";
      onChunk(errMsg);
      return errMsg;
    }
  }
};

/**
 * Standard (non-streaming) message send — always works as reliable fallback
 */
export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!chatSession) {
    await initializeChatSession(currentInstruction || '', currentMood, currentLanguage, currentUsername);
  }
  if (!chatSession) throw new Error("Failed to initialize chat session");

  try {
    const result = await chatSession.sendMessage({ message });
    return result.text || "...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Retry once with fresh session
    try {
      await initializeChatSession(currentInstruction, currentMood, currentLanguage, currentUsername);
      if (chatSession) {
        const retryResult = await chatSession.sendMessage({ message });
        return retryResult.text || "...";
      }
    } catch (retryError) {
      console.error("Retry failed:", retryError);
    }
    return "⚡ Connection issue... try again!";
  }
};

export const isSessionReady = (): boolean => !!chatSession;

export const resetSession = () => {
  chatSession = null;
};