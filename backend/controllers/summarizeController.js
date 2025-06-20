// controllers/summarizeController.js
import { AzureOpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new AzureOpenAI({
  endpoint: process.env.OPENAI_ENDPOINT,
  apiKey: process.env.OPENAI_KEY,
  apiVersion: process.env.OPENAI_API_VERSION,
  deployment: process.env.OPENAI_DEPLOYMENT,
});

export async function getSummary(req, res) {
  const { text, lang = 'en' } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Missing 'text'" });
  }

  try {
    const result = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a summarizer bot. Summarize the given text in the same language it is written (language: ${lang}).`,
        },
        {
          role: "user",
          content: `Summarize this:\n${text}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    res.json({ summary: result.choices[0].message.content });
  } catch (error) {
    console.error("Azure OpenAI Error:", error);
    res.status(500).json({ error: "OpenAI call failed", details: error.message });
  }
}

