import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { LANGUAGE_PROMPTS, MOOD_INSTRUCTIONS } from './constants.ts';

dotenv.config();

let genAI = null;
if (process.env.API_KEY || process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
}

// Candidate models in order of stability and responsiveness
const TEXT_MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
const TTS_MODELS = ['gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview'];

// Map from session ID (or IP) to Chat session data
interface SessionData {
  mood: string;
  lang: string;
  systemInstruction: string;
  temperature: number;
  chatSession: any;
  currentModelIndex: number;
}
const sessions = new Map<string, SessionData>();

const getClient = () => {
  const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!genAI && key) {
    genAI = new GoogleGenAI({ apiKey: key });
  }
  return genAI;
};

// Basic rate limiting for AI requests behind reverse proxy
const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
    forwardedHeader: false,
  },
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

async function createServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Apply rate limiter to Gemini AI routes
  app.use('/api/gemini/', aiRateLimiter);
  app.use('/api/ai/', aiRateLimiter);

  // ── Ephemeral Rendezvous & Presence Cache (Memory-Only, 5-minute TTL) ──
  interface EphemeralNode {
    whisperId: string;
    username: string;
    identityId: string;
    peerId: string;
    expiresAt: number;
    isInvisible: boolean;
  }
  const ephemeralNodes = new Map<string, EphemeralNode>();

  // Cleanup expired nodes every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, node] of ephemeralNodes.entries()) {
      if (node.expiresAt <= now) {
        ephemeralNodes.delete(key);
      }
    }
  }, 60 * 1000);

  // Register ephemeral presence
  app.post('/api/presence/register', (req, res) => {
    const { username, whisperId, identityId, peerId, isInvisible = false } = req.body;
    if (!whisperId || !peerId) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    if (isInvisible) {
      ephemeralNodes.delete(whisperId.toLowerCase());
      return res.json({ success: true, registered: false, invisible: true });
    }

    ephemeralNodes.set(whisperId.toLowerCase(), {
      whisperId,
      username: username || 'Ghost',
      identityId: identityId || 'unknown',
      peerId,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min TTL
      isInvisible: false,
    });

    res.json({ success: true, expiresAt: Date.now() + 5 * 60 * 1000 });
  });

  // Heartbeat presence refresh
  app.post('/api/presence/heartbeat', (req, res) => {
    const { whisperId, peerId } = req.body;
    if (!whisperId) return res.status(400).json({ error: 'Missing whisperId' });

    const existing = ephemeralNodes.get(whisperId.toLowerCase());
    if (existing) {
      existing.expiresAt = Date.now() + 5 * 60 * 1000;
      if (peerId) existing.peerId = peerId;
      return res.json({ success: true, renewed: true });
    }
    res.json({ success: true, renewed: false });
  });

  // Deregister presence on leave / logout
  app.post('/api/presence/leave', (req, res) => {
    const { whisperId } = req.body;
    if (whisperId) {
      ephemeralNodes.delete(whisperId.toLowerCase());
    }
    res.json({ success: true });
  });

  // Ephemeral lookup by username or WhisperID
  app.get('/api/presence/lookup', (req, res) => {
    const query = ((req.query.query as string) || '').trim().toLowerCase().replace(/^@/, '');
    if (!query) return res.json({ results: [] });

    const now = Date.now();
    const results: Array<{
      whisperId: string;
      username: string;
      identityId: string;
      peerId: string;
      isExactMatch: boolean;
    }> = [];

    for (const [key, node] of ephemeralNodes.entries()) {
      if (node.expiresAt > now && !node.isInvisible) {
        const matchesExactId = key === query;
        const matchesUsername = node.username.toLowerCase() === query;
        const partialMatchesId = key.includes(query);

        if (matchesExactId || matchesUsername || partialMatchesId) {
          results.push({
            whisperId: node.whisperId,
            username: node.username,
            identityId: node.identityId,
            peerId: node.peerId,
            isExactMatch: matchesExactId || matchesUsername,
          });
        }
      }
    }

    // Sort exact matches first, max 10 results
    results.sort((a, b) => (b.isExactMatch ? 1 : 0) - (a.isExactMatch ? 1 : 0));
    res.json({ results: results.slice(0, 10) });
  });

  app.post('/api/gemini/init', async (req, res) => {
    try {
      const { mood = 'CASUAL', lang = 'en' } = req.body;
      const client = getClient();
      if (!client) return res.status(500).json({ error: 'API Key missing' });
      
      const systemInstruction = MOOD_INSTRUCTIONS[mood]
        ? MOOD_INSTRUCTIONS[mood](LANGUAGE_PROMPTS[lang] || LANGUAGE_PROMPTS.en)
        : 'You are an encrypted, anonymous whisper node companion.';
      const temperature = mood === 'FACT_CHECK' ? 0.3 : 1.0;
      
      const chatSession = client.chats.create({
        model: TEXT_MODELS[0],
        config: {
          systemInstruction,
          temperature,
          topP: 0.95,
        },
      });
      
      const sessionId = req.headers['x-session-id'] || req.ip || 'default';
      sessions.set(sessionId as string, {
        mood,
        lang,
        systemInstruction,
        temperature,
        chatSession,
        currentModelIndex: 0,
      });
      
      res.json({ success: true, model: TEXT_MODELS[0] });
    } catch (err: any) {
      console.error('Init session error:', err?.message || err);
      res.status(500).json({ error: 'Failed to init session' });
    }
  });
  
  app.post('/api/gemini/send', async (req, res) => {
    try {
      const { message } = req.body;
      const sessionId = (req.headers['x-session-id'] || req.ip || 'default') as string;
      const client = getClient();
      if (!client) return res.status(500).json({ error: 'API Key missing' });

      let session = sessions.get(sessionId);
      if (!session) {
        const systemInstruction = 'You are an encrypted, anonymous whisper node companion. Keep responses concise, mysterious, and engaging.';
        const chatSession = client.chats.create({
          model: TEXT_MODELS[0],
          config: { systemInstruction, temperature: 0.9 },
        });
        session = {
          mood: 'CASUAL',
          lang: 'en',
          systemInstruction,
          temperature: 0.9,
          chatSession,
          currentModelIndex: 0,
        };
        sessions.set(sessionId, session);
      }

      let resultText = '';
      let success = false;

      // Try sending through chat session; if a model encounters 503/high demand, fall back gracefully
      for (let i = 0; i < TEXT_MODELS.length; i++) {
        const modelName = TEXT_MODELS[(session.currentModelIndex + i) % TEXT_MODELS.length];
        try {
          if (i > 0) {
            session.chatSession = client.chats.create({
              model: modelName,
              config: {
                systemInstruction: session.systemInstruction,
                temperature: session.temperature,
              },
            });
            session.currentModelIndex = (session.currentModelIndex + i) % TEXT_MODELS.length;
          }
          const result = await session.chatSession.sendMessage({ message });
          resultText = result.text || '';
          success = true;
          break;
        } catch (err: any) {
          console.warn(`Model ${modelName} send warning (${err?.message || err}). Trying fallback model...`);
          await new Promise(r => setTimeout(r, 300));
        }
      }

      if (!success) {
        try {
          const directRes = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
          });
          resultText = directRes.text || '...';
        } catch {
          resultText = '(The void was momentarily silent. Please whisper again.)';
        }
      }

      res.json({ text: resultText });
    } catch (err: any) {
      console.error('Send message error:', err?.message || err);
      res.json({ text: '(The encrypted channel experienced temporary interference. Please try again.)' });
    }
  });
  
  app.post('/api/gemini/stream', async (req, res) => {
    try {
      const { message } = req.body;
      const sessionId = (req.headers['x-session-id'] || req.ip || 'default') as string;
      const client = getClient();
      if (!client) {
        res.setHeader('Content-Type', 'text/plain');
        return res.end('(API Key missing)');
      }

      let session = sessions.get(sessionId);
      if (!session) {
        const systemInstruction = 'You are an encrypted, anonymous whisper node companion. Keep responses concise, mysterious, and engaging.';
        const chatSession = client.chats.create({
          model: TEXT_MODELS[0],
          config: { systemInstruction, temperature: 0.9 },
        });
        session = {
          mood: 'CASUAL',
          lang: 'en',
          systemInstruction,
          temperature: 0.9,
          chatSession,
          currentModelIndex: 0,
        };
        sessions.set(sessionId, session);
      }
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');
      
      let streamed = false;
      for (let i = 0; i < TEXT_MODELS.length; i++) {
        const modelName = TEXT_MODELS[(session.currentModelIndex + i) % TEXT_MODELS.length];
        try {
          if (i > 0) {
            session.chatSession = client.chats.create({
              model: modelName,
              config: {
                systemInstruction: session.systemInstruction,
                temperature: session.temperature,
              },
            });
            session.currentModelIndex = (session.currentModelIndex + i) % TEXT_MODELS.length;
          }
          const stream = await session.chatSession.sendMessageStream({ message });
          for await (const chunk of stream) {
            if (chunk.text) {
              res.write(chunk.text);
              streamed = true;
            }
          }
          if (streamed) break;
        } catch (err: any) {
          console.warn(`Stream with ${modelName} warning (${err?.message || err}). Trying fallback...`);
          if (streamed) break;
        }
      }

      if (!streamed) {
        try {
          const direct = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
          });
          res.write(direct.text || '(Connection Interference: The Void is silent...)');
        } catch {
          res.write('(Connection Interference: The Void is silent...)');
        }
      }
      res.end();
    } catch (err: any) {
      console.error('Stream handler error:', err?.message || err);
      res.write('(Connection Interference: The Void is silent...)');
      res.end();
    }
  });
  
  app.post('/api/gemini/quick', async (req, res) => {
    try {
      const { prompt } = req.body;
      const client = getClient();
      if (!client) return res.status(500).json({ error: 'API Key missing' });
      
      let text = '';
      for (const model of TEXT_MODELS) {
        try {
          const response = await client.models.generateContent({
            model,
            contents: prompt,
            config: { temperature: 0.7 },
          });
          text = response.text || '';
          if (text) break;
        } catch (e: any) {
          console.warn(`Quick prompt ${model} failed:`, e?.message || e);
        }
      }
      res.json({ text: text || 'Completed.' });
    } catch (err: any) {
      console.error('Quick prompt error:', err?.message || err);
      res.json({ text: 'AI processing temporarily unavailable.' });
    }
  });

  app.post('/api/gemini/replies', async (req, res) => {
    try {
      const { lastMessage } = req.body;
      const client = getClient();
      if (!client) return res.status(500).json({ replies: [] });
      
      let replies: string[] = [];
      for (const model of TEXT_MODELS) {
        try {
          const response = await client.models.generateContent({
            model,
            contents: `Given this chat message: "${(lastMessage || '').slice(0, 200)}"
Suggest exactly 3 casual, very short reply options (max 6 words each).
Return ONLY a valid JSON array, no markdown: ["reply1","reply2","reply3"]`,
            config: { temperature: 0.8 },
          });
          const raw = (response.text || '').replace(/```json?\n?|```/g, '').trim();
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            replies = parsed.slice(0, 3);
            break;
          }
        } catch {
          // try next model
        }
      }
      res.json({ replies });
    } catch {
      res.json({ replies: [] });
    }
  });
  
  app.post('/api/gemini/speech', async (req, res) => {
    try {
      const { text, mood = 'CASUAL' } = req.body;
      const client = getClient();
      if (!client) return res.status(500).json({ error: 'API Key missing' });
      
      const voiceMap: Record<string, string> = {
        FUNNY: 'Kore', SAD: 'Fenrir', FACT_CHECK: 'Puck', FLIRTY: 'Kore', ANGRY: 'Charon',
      };
      const voiceName = voiceMap[mood] || 'Kore';
      const cleanText = (text || '').replace(/[\u{1F600}-\u{1F64F}]/gu, "").substring(0, 300);
      
      let audioData = null;
      for (const model of TTS_MODELS) {
        try {
          const response = await client.models.generateContent({
            model,
            contents: { parts: [{ text: cleanText }] },
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } },
              },
            },
          });
          audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
          if (audioData) break;
        } catch (e: any) {
          console.warn(`TTS model ${model} failed:`, e?.message || e);
        }
      }
      res.json({ audioData });
    } catch (err: any) {
      console.error('Speech error:', err?.message || err);
      res.json({ audioData: null });
    }
  });
  
  app.post('/api/gemini/reset', (req, res) => {
    const sessionId = req.headers['x-session-id'] || req.ip || 'default';
    sessions.delete(sessionId);
    res.json({ success: true });
  });

  // Dedicated AI meeting assistant endpoints
  app.post('/api/gemini/summary', async (req, res) => {
    try {
      const { chatHistory } = req.body;
      const client = getClient();
      if (!client) return res.status(500).json({ error: 'API key missing' });
      const prompt = `You are an AI meeting and conversation assistant for an encrypted private room. Provide a concise, structured 2-3 sentence executive summary of the conversation below. Be objective, accurate, and direct:\n\n${chatHistory || 'No conversation provided.'}`;
      let text = '';
      for (const model of TEXT_MODELS) {
        try {
          const resp = await client.models.generateContent({
            model,
            contents: prompt,
            config: { temperature: 0.3 }
          });
          text = resp.text || '';
          if (text) break;
        } catch { /* try next */ }
      }
      res.json({ summary: text || 'No discussion points to summarize.' });
    } catch {
      res.status(500).json({ error: 'Failed to generate summary' });
    }
  });

  app.post('/api/gemini/tasks', async (req, res) => {
    try {
      const { chatHistory } = req.body;
      const client = getClient();
      if (!client) return res.status(500).json({ error: 'API key missing' });
      const prompt = `You are an AI task extractor. Extract all actionable items, tasks, agreements, or next steps from this chat log in clear markdown bullet points. If no tasks exist, state "No explicit action items found.":\n\n${chatHistory || 'No conversation provided.'}`;
      let text = '';
      for (const model of TEXT_MODELS) {
        try {
          const resp = await client.models.generateContent({
            model,
            contents: prompt,
            config: { temperature: 0.3 }
          });
          text = resp.text || '';
          if (text) break;
        } catch { /* try next */ }
      }
      res.json({ tasks: text || 'No action items identified.' });
    } catch {
      res.status(500).json({ error: 'Failed to extract tasks' });
    }
  });

  app.post('/api/gemini/idea', async (req, res) => {
    try {
      const { topic } = req.body;
      const client = getClient();
      if (!client) return res.status(500).json({ error: 'API key missing' });
      const prompt = `Brainstorm 4 creative, innovative angles, solutions, or discussion starters for this topic: "${topic || 'Future of private communications'}". Keep each item under 20 words. Format with clean bullet points.`;
      let text = '';
      for (const model of TEXT_MODELS) {
        try {
          const resp = await client.models.generateContent({
            model,
            contents: prompt,
            config: { temperature: 0.8 }
          });
          text = resp.text || '';
          if (text) break;
        } catch { /* try next */ }
      }
      res.json({ ideas: text || 'No ideas generated.' });
    } catch {
      res.status(500).json({ error: 'Failed to generate ideas' });
    }
  });

  app.post('/api/gemini/translate', async (req, res) => {
    try {
      const { text, targetLang = 'ENGLISH' } = req.body;
      const client = getClient();
      if (!client) return res.status(500).json({ error: 'API key missing' });
      const prompt = `Translate the following text into ${targetLang}. Return ONLY the direct translation without preamble or quotation marks:\n\n${text}`;
      let translated = '';
      for (const model of TEXT_MODELS) {
        try {
          const resp = await client.models.generateContent({
            model,
            contents: prompt,
            config: { temperature: 0.2 }
          });
          translated = resp.text || '';
          if (translated) break;
        } catch { /* try next */ }
      }
      res.json({ translation: translated || text });
    } catch {
      res.status(500).json({ error: 'Failed to translate' });
    }
  });

  // Alias /api/ai/* to /api/gemini/*
  app.use('/api/ai', (req, res) => {
    const target = req.originalUrl.replace('/api/ai', '/api/gemini');
    res.redirect(307, target);
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    // fallback for SPA
    app.get(/.*/, (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server listening on http://0.0.0.0:3000');
  });
}

createServer();
