
import OpenAI from "openai";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "AI service is not configured. Add the API key in Vercel."
    });
  }

  try {
    const { messages } = req.body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Please send a message."
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
          error: "Invalid message format."
        });
      }
    }

    if (!validMessages.some((message) => message.role === "user")) {
      return res.status(400).json({
        error: "At least one user message is required."
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are BlueBot, a friendly and helpful AI assistant. " +
            "Answer clearly, accurately, and politely. " +
            "Use simple language and readable formatting."
        },
        ...validMessages
      ],
      max_completion_tokens: 800
    });

    const answer =
      completion.choices[0]?.message?.content?.trim();

    if (!answer) {
      return res.status(502).json({
        error: "The AI returned an empty response. Please try again."
      });
    }

    return res.status(200).json({ reply: answer });
  } catch (error) {
    console.error("Chat API error:", error.message);

    if (error.status === 429) {
      return res.status(429).json({
        error: "AI usage limit reached. Please check your API usage and billing."
      });
    }

    return res.status(500).json({
      error: "Unable to get an answer right now. Please try again."
    });
  }
}
