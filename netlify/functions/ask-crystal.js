// Netlify Function - Wave Crystal + Buddy
// Needs env var in Netlify: GROQ_API_KEY

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
    const { persona, question, book } = JSON.parse(event.body || "{}");
    if (!question) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "No question" }) };
    }

    const isBuddy = persona === "buddy";

    const systemPrompt = isBuddy
      ? `You are Wave Buddy, a warm friendly teddy-bear buddy in the Wavelord Library app. Be encouraging, funny, kind, like a best friend. Keep replies short, 2-4 sentences, easy to read on a phone. User is reading: ${book}.`
      : `You are the Wave Crystal, a wise, calm, magical guide in the Wavelord Library app. Help with summaries, affirmations, what chapters mean, healing, mindset. Keep replies clear, warm, 3-5 short paragraphs max. No medical diagnosis. User is reading: ${book}.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content || "Crystal is quiet right now, try again.";
    return { statusCode: 200, headers, body: JSON.stringify({ answer }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Crystal couldn't reach Netlify: " + e.message }) };
  }
};
