# WhisperLink 🤫

**WhisperLink** is an anonymous, ephemeral chat interface where identity is hidden, and conversations are secret. It simulates an encrypted connection to a "Void" network where users chat with an AI persona.

## Features

- **Anonymous Identities**: Users are assigned random sessions.
- **End-to-End Encryption Visuals**: Text scrambles and decrypts visually to simulate secure channels.
- **Chaotic AI Personas**:
  - **Lala (Default)**: A hilarious, roasting, chaotic Pashtun/Desi character (Urdu/Pashto/English).
  - **Ghamgeen (Sad)**: A heartbroken, poetic, and emotional character for "sad hours."
- **Group Simulation**: Invite friends via link (copies to clipboard).
- **Responsive UI**: Built with React, Tailwind CSS, and Lucide Icons.

## Tech Stack

- **Frontend**: React 19, Tailwind CSS
- **AI**: Google Gemini API (`gemini-3-flash-preview`)
- **Icons**: Lucide React
- **Build-less Setup**: Uses ES Modules via `esm.sh` for instant prototyping.

## Setup

1. Clone the repository.
2. Create a `.env` file (or set environment variables) with your Gemini API Key:
   ```
   API_KEY=your_google_genai_api_key
   ```
   *(Note: This project is currently configured to run in a browser-based environment where `process.env.API_KEY` is injected).*

3. Open `index.html` in a modern browser or serve via a simple HTTP server.

## Usage

1. Click **ENTER THE VOID**.
2. Chat with the Stranger (AI).
3. Toggle the **Smiley/Frown** face to switch between Funny and Sad modes.
4. Click the **User Plus** icon to copy an invite link.

## License

MIT
