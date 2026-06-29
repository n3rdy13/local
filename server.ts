import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Safely extract a JSON block from a raw Gemini text response.
function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const firstBrace = raw.indexOf("{");
  const firstBracket = raw.indexOf("[");
  const start =
    firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)
      ? firstBrace
      : firstBracket;

  if (start === -1) return raw.trim();

  const openChar = raw[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === openChar) depth++;
    else if (raw[i] === closeChar) {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return raw.slice(start).trim();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const geminiApiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;

  if (geminiApiKey) {
    ai = new GoogleGenAI({ apiKey: geminiApiKey });
  }

  // ─────────────────────────────────────────────────
  // POST /api/drum-coach (Persona Chatbot endpoint)
  // ─────────────────────────────────────────────────
  app.post("/api/drum-coach", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not configured.",
        });
      }

      const { message, history = [] } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const formattedHistory = history.map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

      const systemInstruction = `You are "Coach Dave", an elite master drumming instructor, specializing in drum rudiments (rolls, diddles, flams, drags), speed training, stick mechanics, and polymetric grooves. Give precise tips on how to improve practice performance, grip, or relaxation. Keep answers enthusiastic, clear, professional, and concise. Always answer in 2-3 short paragraphs maximum.`;

      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        history: formattedHistory,
        config: { systemInstruction, temperature: 0.7 },
      });

      const response = await chat.sendMessage({ message });
      res.json({ reply: response.text ?? "Keep tapping and polishing those single strokes!" });
    } catch (error: any) {
      console.error("Coach Dave Chat Error:", error);
      res.status(500).json({ error: error.message || "Chat failed." });
    }
  });

  // ─────────────────────────────────────────────────
  // POST /api/generate-drum-routine
  // ─────────────────────────────────────────────────
  app.post("/api/generate-drum-routine", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
      }

      const { bpm } = req.body as { bpm: number };
      const targetBpm = bpm || 100;

      const prompt = `You are an elite percussion director. Synthesize a creative custom drum rudiment workout routine for a practitioner practicing around ${targetBpm} BPM.
      
      Return ONLY a valid JSON object with exactly this structure (no markdown fences, no formatting, no extra text):
      {
        "name": "string — a catchy, professional routine name",
        "description": "string — a brief description of the routine focus",
        "steps": [
          {
            "rudimentId": "single-stroke-roll" or "double-stroke-roll" or "single-paradiddle" or "double-paradiddle" or "flam" or "flam-tap" or "drag" or "five-stroke-roll",
            "durationMinutes": 3,
            "startBpm": ${targetBpm},
            "targetBpm": ${targetBpm + 15}
          }
        ]
      }
      
      Ensure you only use one of the listed valid rudimentId options. Return ONLY raw JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.5 },
      });

      const rawText = response.text ?? "";
      if (!rawText.trim()) {
        return res.status(502).json({ error: "Gemini returned empty response." });
      }

      let routineData: any;
      try {
        routineData = JSON.parse(extractJSON(rawText));
      } catch {
        console.error("Failed to parse routine. Raw:", rawText);
        return res.status(502).json({ error: "Response could not be parsed as JSON." });
      }

      res.json(routineData);
    } catch (error: any) {
      console.error("Generate Routine Error:", error);
      res.status(500).json({ error: error.message || "Routine generation failed." });
    }
  });

  // ─────────────────────────────────────────────────
  // POST /api/generate-drum-groove
  // ─────────────────────────────────────────────────
  app.post("/api/generate-drum-groove", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
      }

      const { bpm } = req.body as { bpm: number };
      const currentBpm = bpm || 100;

      const prompt = `You are a legendary drum machine sequencer. Design an 8-step groove pattern (combining hihat, snare, and kick) at ${currentBpm} BPM.
      
      Return ONLY a valid JSON object with exactly this structure (no markdown fences, no explanation text):
      {
        "name": "string — an evocative name for this drum loop",
        "description": "string — a brief description of the musical style of the groove",
        "pattern": {
          "hihat": [true, true, true, true, true, true, true, true],
          "snare": [false, false, true, false, false, false, true, false],
          "kick": [true, false, false, false, true, false, false, false]
        }
      }
      
      Rules:
      - The pattern array fields must have exactly 8 elements of boolean values (true means play/trigger, false means rest).
      - Try to make the grooves interesting (e.g., syncopated, bossa-nova, punk rock, hip-hop swing, funky shuffle).
      - Return only valid raw JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.6 },
      });

      const rawText = response.text ?? "";
      if (!rawText.trim()) {
        return res.status(502).json({ error: "Gemini returned empty groove response." });
      }

      let grooveData: any;
      try {
        grooveData = JSON.parse(extractJSON(rawText));
      } catch {
        console.error("Failed to parse groove. Raw:", rawText);
        return res.status(502).json({ error: "Response could not be parsed as JSON." });
      }

      res.json(grooveData);
    } catch (error: any) {
      console.error("Generate Groove Error:", error);
      res.status(500).json({ error: error.message || "Groove generation failed." });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", hasAPIKey: !!geminiApiKey });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware attached");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (!geminiApiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not configured.");
    }
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
