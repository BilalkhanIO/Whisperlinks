import { GoogleGenAI, Chat } from "@google/genai";
import { FUNNY_INSTRUCTION } from "../constants";

let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

export const initializeChatSession = async (instruction: string = FUNNY_INSTRUCTION): Promise<void> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  chatSession = genAI.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: instruction,
      temperature: 1.1, // Higher temperature for more chaotic/creative responses
      topP: 0.95,
      topK: 64,
    },
  });
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!chatSession) {
    await initializeChatSession();
  }

  if (!chatSession) {
    throw new Error("Failed to initialize chat session");
  }

  try {
    const result = await chatSession.sendMessage({ message });
    return result.text || "...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Attempt to re-init if session is stale/broken
    try {
        await initializeChatSession(); 
        if(chatSession) {
             const retryResult = await chatSession.sendMessage({ message });
             return retryResult.text || "...";
        }
    } catch(retryError) {
        console.error("Retry failed", retryError);
    }
    return "Oye, internet chala gaya lagta hai! (Connection Error)";
  }
};

export const resetSession = () => {
  chatSession = null;
};