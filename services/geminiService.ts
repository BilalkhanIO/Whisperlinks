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
};

export const initializeChatSession = async (mood: ChatMood, lang: ChatLanguage): Promise<void> => {
  const client = getClient();
  if (!client) throw new Error("API Key is missing");

  const systemInstruction = MOOD_INSTRUCTIONS[mood](LANGUAGE_PROMPTS[lang]);

  chatSession = client.chats.create({
    model: "gemini-1.5-flash",
    config: {
      systemInstruction,
      temperature: mood === 'FACT_CHECK' ? 0.3 : 1.1,
      topP: 0.95,
      topK: 64,
    },
  });
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!chatSession) await initializeChatSession('FUNNY', 'ENGLISH');
  if (!chatSession) throw new Error("Session init failed");

  try {
    const result = await chatSession.sendMessage({ message });
    return result.text || "...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "(Connection Interference: The Void is silent...)";
  }
};

export async function* streamMessageToGemini(message: string): AsyncGenerator<string> {
  if (!chatSession) await initializeChatSession('FUNNY', 'ENGLISH');
  if (!chatSession) { yield "(Session init failed)"; return; }

  try {
    const stream = chatSession.sendMessageStream({ message });
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  } catch {
    yield "(Connection Interference: The Void is silent...)";
  }
}

export const generateSmartReplies = async (lastMessage: string): Promise<string[]> => {
  const client = getClient();
  if (!client) return [];
  try {
    const response = await client.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Given this chat message: "${lastMessage.slice(0, 200)}"
Suggest exactly 3 casual, very short reply options (max 6 words each).
Return ONLY a valid JSON array, no markdown: ["reply1","reply2","reply3"]`,
      config: { temperature: 0.8 },
    });
    const raw = (response.text || '').replace(/```json?\n?|```/g, '').trim();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
};

export const generateSpeech = async (text: string, mood: ChatMood): Promise<string | null> => {
  const client = getClient();
  if (!client) return null;

  try {
    const voiceMap: Record<ChatMood, string> = {
      FUNNY: 'Kore', SAD: 'Fenrir', FACT_CHECK: 'Puck', FLIRTY: 'Kore', ANGRY: 'Charon',
    };
    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}]/gu, "").substring(0, 300);

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text: cleanText }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceMap[mood] } },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch {
    return null;
  }
};

export const resetSession = () => { chatSession = null; };
