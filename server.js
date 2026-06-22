import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import { GoogleGenAI, createPartFromBase64 } from '@google/genai';

const {
    GEMINI_API_KEY,
    MONGODB_URI,
    MONGODB_DB = 'speech_assistant',
    PORT = 3000
} = process.env;

if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
}

if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI");
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.static("public")); // This serves your frontend files

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const mongo = new MongoClient(MONGODB_URI);
let conversations;

async function connectMongo() {
    try {
        await mongo.connect();
        const db = mongo.db(MONGODB_DB);
        conversations = db.collection("conversations");
        await conversations.createIndex({ sessionId: 1, createdAt: -1 });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        throw error;
    }
}

async function getRecentTurns(sessionId) {
    try {
        return await conversations
            .find({ sessionId })
            .sort({ createdAt: -1 })
            .limit(15)
            .toArray();
    } catch (error) {
        console.error('Error fetching recent turns:', error);
        return [];
    }
}

function parseAssistantResponse(text) {
    try {
        return JSON.parse(text);
    } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]);
        } catch {
            return null;
        }
    }
}

async function saveTurn({ sessionId, userText, assistantText, language, languageName }) {
    const now = new Date();
    try {
        await conversations.insertOne({
            sessionId,
            userText,
            assistantText,
            language,
            languageName,
            model: "gemini-2.5-flash",
            createdAt: now
        });
        return now;
    } catch (error) {
        console.error('Error saving turn:', error);
        throw error;
    }
}

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "AI Voice Assistant Running",
        model: "gemini-2.5-flash"
    });
});

app.post("/api/chat", async (req, res) => {
    try {
        const { sessionId, message } = req.body;

        if (!sessionId || !message) {
            return res.status(400).json({ error: "sessionId and message required" });
        }

        const history = await getRecentTurns(sessionId);

        const context = history
            .reverse()
            .map(x => `User:\n${x.userText}\nAssistant:\n${x.assistantText}`)
            .join("\n\n");

        const prompt = `
You are an intelligent multilingual voice assistant.
Detect the user's language automatically.
If user speaks Tamil, reply in Tamil.
If user speaks English, reply in English.
If user mixes Tamil and English, reply naturally mixing both.
Keep answers short and conversational.

Recent Conversation:
${context}

User:
${message}

Return ONLY JSON:
{
    "language":"ta-IN",
    "languageName":"Tamil",
    "assistantText":"..."
}

Possible language values:
ta-IN
en-US
hi-IN
te-IN
ml-IN

Do not return markdown.
Only JSON.
`;

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        const raw = result.text?.trim() || "";
        const parsed = parseAssistantResponse(raw);
        const assistantText = parsed?.assistantText || raw;
        const language = parsed?.language || "en-US";
        const languageName = parsed?.languageName || "English";

        const now = await saveTurn({
            sessionId,
            userText: message,
            assistantText,
            language,
            languageName
        });

        res.json({
            assistantText,
            language,
            languageName,
            createdAt: now
        });

    } catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/voice", async (req, res) => {
    try {
        const { sessionId, audioBase64, mimeType = "audio/webm" } = req.body;

        if (!sessionId || !audioBase64) {
            return res.status(400).json({ error: "sessionId and audio required" });
        }

        const prompt = `
You are a live multilingual AI assistant.
Listen carefully.
Detect spoken language automatically.
If Tamil: reply Tamil.
If English: reply English.
If Tamil and English mixed: reply naturally mixing both.
Keep answers short.

Return ONLY JSON:
{
    "language":"ta-IN",
    "languageName":"Tamil",
    "transcript":"...",
    "assistantText":"..."
}

Possible language values:
ta-IN
en-US
hi-IN
te-IN
ml-IN

Only JSON.
`;

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        createPartFromBase64(audioBase64, mimeType)
                    ]
                }
            ]
        });

        const raw = result.text?.trim() || "";
        const parsed = parseAssistantResponse(raw);
        const transcript = parsed?.transcript || "[Voice]";
        const assistantText = parsed?.assistantText || raw;
        const language = parsed?.language || "en-US";
        const languageName = parsed?.languageName || "English";

        const now = await saveTurn({
            sessionId,
            userText: transcript,
            assistantText,
            language,
            languageName
        });

        res.json({
            transcript,
            assistantText,
            language,
            languageName,
            createdAt: now
        });

    } catch (err) {
        console.error('Voice error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/history/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sessionId) {
            return res.status(400).json({ error: "sessionId required" });
        }

        const turns = await conversations
            .find({ sessionId })
            .sort({ createdAt: 1 })
            .limit(100)
            .toArray();

        res.json(turns.map(({ _id, ...x }) => ({
            id: _id.toString(),
            ...x
        })));

    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/sessions", async (req, res) => {
    try {
        const sessions = await conversations
            .aggregate([
                { $sort: { createdAt: -1 } },
                {
                    $group: {
                        _id: "$sessionId",
                        lastMessage: { $first: "$userText" },
                        updatedAt: { $first: "$createdAt" },
                        turns: { $sum: 1 }
                    }
                },
                { $sort: { updatedAt: -1 } },
                { $limit: 30 }
            ])
            .toArray();

        res.json(sessions.map(x => ({
            sessionId: x._id,
            lastMessage: x.lastMessage,
            updatedAt: x.updatedAt,
            turns: x.turns
        })));

    } catch (error) {
        console.error('Sessions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server with proper error handling
async function startServer() {
    try {
        await connectMongo();
        
        const server = app.listen(PORT, () => {
            console.log(`Server running: http://localhost:${PORT}`);
        });

        // Graceful shutdown
        const gracefulShutdown = async () => {
            console.log('Shutting down gracefully...');
            server.close(async () => {
                try {
                    await mongo.close();
                    console.log('MongoDB connection closed');
                    process.exit(0);
                } catch (error) {
                    console.error('Error closing MongoDB:', error);
                    process.exit(1);
                }
            });
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();