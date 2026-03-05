import type { Response } from "express";
import Groq from "groq-sdk";
import type { ModelProvider } from "./router.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const streamLLMResponse = async (
  prompt: string,
  provider: ModelProvider,
  res: Response,
): Promise<string> => {
  let fullResponse = "";

  if (provider === "cloud_groq") {
    console.log(`Routing to Groq (Llama 3 8B)...`);

    const stream = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || "";
      fullResponse += token;

      if (token) {
        res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
      }
    }
  } else if (provider === "local_ollama") {
    console.log(`Routing to Local Edge (Ollama Llama 3.2)...`);

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3.2", prompt: prompt, stream: true }),
    });

    if (!response.body) throw new Error("Ollama stream failed");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        const parsed = JSON.parse(line);
        fullResponse += parsed.response;
        res.write(`data: ${JSON.stringify({ text: parsed.response })}\n\n`);
      }
    }
  }

  return fullResponse;
};
