import { ChatMood, ChatLanguage } from "../types";

const sessionId = Math.random().toString(36).substring(2);

const getHeaders = () => ({
  "Content-Type": "application/json",
  "x-session-id": sessionId
});

export const initializeChatSession = async (mood: ChatMood, lang: ChatLanguage): Promise<void> => {
  try {
    const res = await fetch("/api/gemini/init", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ mood, lang }),
    });
    if (!res.ok) {
      console.warn("Session init warning, server fallback active");
    }
  } catch (e) {
    console.warn("Session init network warning:", e);
  }
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  try {
    const res = await fetch("/api/gemini/send", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      return "(The void is temporarily overloaded. Please whisper again in a moment.)";
    }
    const data = await res.json();
    return data.text || "...";
  } catch (error) {
    console.warn("Gemini service warning:", error);
    return "(Connection Interference: The Void is silent...)";
  }
};

export async function* streamMessageToGemini(message: string): AsyncGenerator<string> {
  try {
    const res = await fetch("/api/gemini/stream", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ message }),
    });
    
    if (!res.ok || !res.body) {
      yield "(Session init failed)";
      return;
    }
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      yield chunk;
    }
  } catch {
    yield "(Connection Interference: The Void is silent...)";
  }
}

export const generateSmartReplies = async (lastMessage: string): Promise<string[]> => {
  try {
    const res = await fetch("/api/gemini/replies", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ lastMessage }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.replies || [];
  } catch {
    return [];
  }
};

export const generateSpeech = async (text: string, mood: ChatMood): Promise<string | null> => {
  try {
    const res = await fetch("/api/gemini/speech", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ text, mood }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.audioData || null;
  } catch {
    return null;
  }
};

export const resetSession = async () => {
  await fetch("/api/gemini/reset", { 
    method: "POST",
    headers: getHeaders()
  });
};

export const executeQuickPrompt = async (prompt: string): Promise<string> => {
  try {
    const res = await fetch("/api/gemini/quick", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return "AI service temporarily unavailable.";
    const data = await res.json();
    return data.text || "...";
  } catch {
    return "Error connecting to AI service.";
  }
};

