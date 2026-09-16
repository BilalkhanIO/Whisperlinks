# WhisperLink 🤫

## Overview
WhisperLink is a private, account-free chat interface. Messages are exchanged directly between browsers using peer-to-peer WebRTC connections. The app features secure rooms, disappearing messages, and AI companion tools to enhance the conversation.

## Features
- **P2P Chat**: Direct browser-to-browser WebRTC encrypted transport.
- **Account-Free**: No signup or user accounts required.
- **Disappearing Messages**: "Whisper" mode for ephemeral messages.
- **AI Companion**: Optional AI chat integrations driven by Google's Gemini models.
- **Voice Interactions**: Browser-native speech recognition and AI TTS.
- **Progressive Web App**: Installable on mobile and desktop.

## Architecture
- **Frontend**: React 18, Vite, Tailwind CSS (compiled), PeerJS.
- **Backend**: Express proxy (serves SPA and proxies AI requests securely).
- **AI API**: Google Gemini (via `@google/genai`).

## Privacy & Security Model
- **Transport**: WebRTC data channels use browser-provided encrypted transport (DTLS).
- **No Chat Logs**: WhisperLink does not maintain a persistent chat history on the server.
- **Peer-to-Peer**: Messages travel directly between participating peers.
- **AI Processing**: Messages sent to AI features are processed by the configured provider. AI is strictly optional.

## Setup & Deployment
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set your environment variables in `.env`:
   ```bash
   API_KEY=your_google_gemini_api_key
   ```
4. Run locally:
   ```bash
   npm run dev
   ```

### Production Build
WhisperLink runs as a Node.js server in production (handling both the static files and API routes).
```bash
npm run build
NODE_ENV=production npm start
```

## Known Limitations
- Does not currently provide true cryptographic application-level end-to-end encryption.
- No media or file transfer support yet.

## License
MIT
