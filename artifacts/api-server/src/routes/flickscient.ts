import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey:  process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

router.post("/flickscient/chat", async (req, res) => {
  const { prompt } = req.body as { prompt: string };
  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });
    const text = completion.choices[0]?.message?.content ?? "No response.";
    res.json({ text });
  } catch (err: any) {
    req.log.error({ err }, "FlickScient AI error");
    res.status(500).json({ error: "AI request failed" });
  }
});

export default router;
