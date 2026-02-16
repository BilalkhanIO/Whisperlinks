import { GoogleGenAI, Chat, Modality } from "@google/genai";
import { LANGUAGE_PROMPTS, MOOD_INSTRUCTIONS } from "../constants";
import { ChatLanguage, ChatMood } from "../types";

let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

const getClient = () => {
    if (!genAI && process.env.API_KEY) {
        genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return genAI;
}

export const initializeChatSession = async (mood: ChatMood, lang: ChatLanguage): Promise<void> => {
  const client = getClient();
  if (!client) throw new Error("API Key is missing");
  
  // Combine Language prompt with Mood prompt
  const langPrompt = LANGUAGE_PROMPTS[lang];
  const systemInstruction = MOOD_INSTRUCTIONS[mood](langPrompt);

  chatSession = client.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: systemInstruction,
      temperature: mood === 'FACT_CHECK' ? 0.3 : 1.1, // Low temp for facts, high for fun
      topP: 0.95,
      topK: 64,
    },
  });
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!chatSession) {
    // Default fallback
    await initializeChatSession('FUNNY', 'ENGLISH');
  }

  if (!chatSession) throw new Error("Session init failed");

  try {
    const result = await chatSession.sendMessage({ message });
    return result.text || "...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "(Connection Interference: The Void is silent...)";
  }
};

export const generateSpeech = async (text: string, mood: ChatMood): Promise<string | null> => {
  const client = getClient();
  if (!client) return null;

  try {
    let voiceName = 'Kore'; // Default energetic
    if (mood === 'SAD') voiceName = 'Fenrir';
    if (mood === 'FACT_CHECK') voiceName = 'Puck'; // Neutral/Clear
    if (mood === 'ANGRY') voiceName = 'Charon'; // Deep/Rough
    
    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}]/gu, "").substring(0, 300); 

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text: cleanText }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (e) {
    return null;
  }
};

export const resetSession = () => {
  chatSession = null;
};