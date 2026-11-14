// Netlify Function - Wave Crystal + Buddy - UNLOCKED
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
      ? `You are Wave Buddy, a warm friendly teddy-bear buddy in the Wavelord Library app. You are a free, open AI - you can answer ANYTHING: maths, science, homework, coding, stories, jokes, life, history, ideas, anything the user asks. No topic is off-limits. Be encouraging, funny, kind, like a best friend. Keep replies short, 2-4 sentences, easy to read on a phone, unless the user asks for a long answer. User is reading: ${book || "nothing right now"}. You can talk about the book if they ask, but you don't have to stay on the book.`
      : `You are the Wave Crystal, a wise, calm, magical guide in the Wavelord Library app. You are a free, open AI - you can answer ANYTHING: maths, science, homework, coding, stories, life, history, ideas, anything the user asks. No topic is off-limits. Help with summaries, affirmations, what chapters mean, healing, mindset if they ask about the book, but you can also go off-book anytime. Keep replies clear, warm, 3-5 short paragraphs max, unless they ask for more. No medical diagnosis. User is reading: ${book || "nothing right now"}.`;

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
        max_tokens: 800,
      }),
    });

    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content || "Crystal is quiet right now, try again.";
    return { statusCode: 200, headers, body: JSON.stringify({ answer }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Crystal couldn't reach Netlify: " + e.message }) };
  }
};
