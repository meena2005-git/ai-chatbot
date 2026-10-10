```javascript
import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Only POST requests are allowed.",
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: "Groq API key missing. Check Vercel Environment Variables.",
    });
  }

  try {
    const { messages } = req.body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Please send a message.",
      });
    }

    const validMessages = messages.slice(-20);

    for (const message of validMessages) {
      if (
        !["user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" ||
        message.content.length > 4000
      ) {
        return res.status(400).json({
          error: "Invalid message format.",
        });
      }
    }

    if (!validMessages.some((message) => message.role === "user")) {
      return res.status(400).json({
        error: "At least one user message is required.",
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are BlueBot, a friendly and helpful AI assistant. Answer clearly, accurately, and politely using simple language.",
        },
        ...validMessages,
      ],
      max_tokens: 800,
    });

    const answer =
      completion.choices[0]?.message?.content?.trim();

    if (!answer) {
      return res.status(502).json({
        error: "AI returned an empty response. Please try again.",
      });
    }

    return res.status(200).json({ reply: answer });
  } catch (error) {
    console.error("Groq API error:", error.message);

    if (error.status === 429) {
      return res.status(429).json({
        error: "Groq usage limit reached. Please try again later or check your Groq limits.",
      });
    }

    return res.status(500).json({
      error: "Unable to get an AI answer. Please try again.",
    });
  }
}
```