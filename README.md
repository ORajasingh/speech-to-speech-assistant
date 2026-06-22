# Speech-to-Speech AI Assistant

A small speech assistant that uses:

- Browser microphone recording for voice input
- Gemini audio understanding for automatic spoken-language detection
- Gemini API for assistant responses
- Browser speech synthesis for spoken replies
- MongoDB for saved conversation history
- A live conversation mode that listens again after each spoken reply
- A past conversations sidebar loaded from MongoDB
- A language selector for typed-message overrides and spoken reply voice hints

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

3. Add your keys to `.env`:

   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
   MONGODB_DB=speech_assistant
   PORT=3000
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open:

   ```text
   http://localhost:3000
   ```

## Using It

- Click `Start Live` to begin a hands-free conversation.
- Keep `Auto detect` selected, then speak in any supported language.
- When you stop speaking, the app sends the audio to Gemini.
- Gemini detects the spoken language, transcribes it, replies in that language, the app speaks the reply, then listens again automatically.
- Click `Stop Live` to stop the live loop.
- Click `Mic` for a single voice message.
- Use the left sidebar to open past conversations saved in MongoDB.
- Click `New` to start a fresh conversation session.

## Notes

- Voice playback quality depends on the voices installed in the browser or operating system.
- The backend stores each turn in the `conversations` collection.
- The `/api/sessions` endpoint lists recent saved conversations.
- Keep `.env` private. Do not commit your API keys.
