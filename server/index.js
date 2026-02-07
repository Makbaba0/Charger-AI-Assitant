import express from "express";
import dotenv from "dotenv";
import { Readable } from "node:stream";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

if (!API_KEY || !VOICE_ID) {
  console.warn("Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID in .env");
}

app.get("/api/tts", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text is required" });
    }
    if (!API_KEY || !VOICE_ID) {
      return res.status(500).json({ error: "Server not configured" });
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`;
    const payload = {
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.85,
        style: 0.35,
        use_speaker_boost: true
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY,
        "accept": "audio/mpeg"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs error", response.status, errText);
      return res.status(502).json({ error: "TTS failed", status: response.status, detail: errText });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    Readable.fromWeb(response.body).pipe(res);
  } catch (err) {
    console.error("Unexpected error", err);
    res.status(500).json({ error: "Unexpected error" });
  }
});

const port = process.env.PORT || 5050;
app.listen(port, () => {
  console.log(`TTS server running on http://localhost:${port}`);
});


