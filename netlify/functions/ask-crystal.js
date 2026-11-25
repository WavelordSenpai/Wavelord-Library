// Wave Crystal + Wave Buddy AI handler
// Supports Gemini (@google/genai via GEMINI_API_KEY) and Groq (GROQ_API_KEY)

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const persona = body.persona === "crystal" ? "crystal" : "buddy";
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const book = typeof body.book === "string" ? body.book.trim() : "";
    const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim().slice(0, 2400) : "";
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

    if (!question) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Please enter a question." }) };
    }

    const contextLines = [
      `Currently open book: ${book || "none selected yet"}.`,
      excerpt ? `Excerpt from the reader's current page:\n"""\n${excerpt}\n"""` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt =
      persona === "buddy"
        ? `You are Wave Buddy, a warm, witty, encouraging reading companion inside Wavelord Library. You can help with anything—book discussions, tough concepts, daily life, encouragement, study questions, coding, history, or creative ideas. Keep answers clear, warm, and conversational (around 2–4 concise paragraphs unless asked for more). ${contextLines}`
        : `You are the Wave Crystal, a calm, insightful literary guide inside Wavelord Library. Help readers explore themes, character motives, chapter meanings, summaries, symbolism, and thoughtful reflections—or any broader question they bring. Keep responses poised, lucid, and well-structured (2–4 concise paragraphs unless asked for depth). Do not provide medical diagnoses. ${contextLines}`;

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (geminiKey) {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const contents = [];
      for (const turn of history) {
        if (!turn || typeof turn.text !== "string" || !turn.text.trim()) continue;
        contents.push({
          role: turn.role === "assistant" ? "model" : "user",
          parts: [{ text: turn.text.trim().slice(0, 1500) }],
        });
      }
      contents.push({ role: "user", parts: [{ text: question }] });

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      const answer = response.text?.trim();
      if (!answer) {
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: "Wave Buddy received an empty response. Please try again." }),
        };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ answer }) };
    }

    if (groqKey) {
      const messages = [{ role: "system", content: systemPrompt }];
      for (const turn of history) {
        if (!turn || typeof turn.text !== "string" || !turn.text.trim()) continue;
        messages.push({
          role: turn.role === "assistant" ? "assistant" : "user",
          content: turn.text.trim().slice(0, 1500),
        });
      }
      messages.push({ role: "user", content: question });

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages,
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          statusCode: res.status,
          headers,
          body: JSON.stringify({ error: data?.error?.message || "Upstream AI request failed." }),
        };
      }

      const answer = data?.choices?.[0]?.message?.content?.trim();
      if (!answer) {
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: "Wave Buddy received an empty response. Please try again." }),
        };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ answer }) };
    }

    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: "AI companion is not configured yet (missing GEMINI_API_KEY or GROQ_API_KEY in server environment).",
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Wave Buddy encountered an error: " + e.message }),
    };
  }
};
