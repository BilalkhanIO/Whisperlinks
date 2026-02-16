
import { GoogleGenAI, Chat, Modality } from "@google/genai";
import { FUNNY_INSTRUCTION } from "../constants";

let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

// Initialize the API client
const getClient = () => {
    if (!genAI && process.env.API_KEY) {
        genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return genAI;
}

export const initializeChatSession = async (instruction: string = FUNNY_INSTRUCTION): Promise<void> => {
  const client = getClient();
  if (!client) throw new Error("API Key is missing");
  
  chatSession = client.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: instruction,
      temperature: 1.1, 
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

export const generateSpeech = async (text: string, mood: 'FUNNY' | 'SAD'): Promise<string | null> => {
  const client = getClient();
  if (!client) return null;

  try {
    // 'Kore' is energetic (good for Lala), 'Fenrir' is deep (good for Ghamgeen)
    const voiceName = mood === 'FUNNY' ? 'Kore' : 'Fenrir'; 
    
    // Truncate text if too long to save latency/quota, as TTS is just for effect
    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}]/gu, "") // Remove emojis for TTS
                          .substring(0, 300); 

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text: cleanText }] },
      config: {
        responseModalities: [Modality.AUDIO], // Use the Modality enum
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    // Extract base64 audio
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (e) {
    console.error("TTS Generation Error", e);
    return null;
  }
};

export const resetSession = () => {
  chatSession = null;
};
