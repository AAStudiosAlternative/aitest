const fetch = require('node-fetch'); // Ensure node-fetch is installed (npm install node-fetch@2)

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY environment variable is not set.");
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing "message" in request body.' });
  }

  try {
    const payload = {
      model: "qwen/qwen-2.5-7b-instruct",
      provider: "deepinfra", // Force DeepInfra as the provider
      messages: [
        { role: "user", content: message }
      ],
      max_tokens: 50 // Limit the response to 50 tokens
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenRouter API error:", errorData);
      if (response.status === 402) {
        return res.status(402).json({ error: "Out of OpenRouter credits—please top up!" });
      }
      return res.status(response.status).json({ error: errorData.error || "Failed to fetch response from OpenRouter." });
    }

    const data = await response.json();
    const assistantResponse = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

    if (!assistantResponse) {
      console.error("Unexpected OpenRouter response format:", data);
      return res.status(500).json({ error: "Invalid response format from OpenRouter." });
    }

    res.status(200).json({ response: assistantResponse });
  } catch (error) {
    console.error("Error in Vercel API:", error);
    if (error.message.includes("fetch")) {
      return res.status(503).json({ error: "Assistant is slow—try again!" });
    }
    return res.status(500).json({ error: "Internal server error." });
  }
};
