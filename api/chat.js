export default async (req, res) => {
  // Check for correct HTTP method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Validate request body
  const { message, identityInstruction } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing "message" in request body.' });
  }

  if (!identityInstruction || typeof identityInstruction !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing "identityInstruction" in request body.' });
  }

  try {
    // Prepare payload for OpenRouter
    const payload = {
      model: "qwen/qwen-2.5-7b-instruct:floor", // Prioritize lowest price (likely DeepInfra)
      messages: [
        { role: "system", content: identityInstruction }, // Use identityInstruction as the system prompt
        { role: "user", content: message }
      ],
      max_tokens: 50 // Limit the response to 50 tokens
    };

    // Make request to OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenRouter API error:", JSON.stringify(errorData, null, 2));
      if (response.status === 402) {
        return res.status(402).json({ error: "Out of OpenRouter credits—please top up!" });
      }
      return res.status(response.status).json({ error: errorData.error || "Failed to fetch response from OpenRouter." });
    }

    // Parse the response
    const data = await response.json();
    const assistantResponse = data.choices?.[0]?.message?.content;

    // Validate the response format
    if (!assistantResponse) {
      console.error("Unexpected OpenRouter response format:", JSON.stringify(data, null, 2));
      return res.status(500).json({ error: "Invalid response format from OpenRouter." });
    }

    // Return the NPC response
    res.status(200).json({ response: assistantResponse });
  } catch (error) {
    // Handle runtime errors
    console.error("Error in Vercel API:", error.message);
    if (error.message.includes("fetch")) {
      return res.status(503).json({ error: "Assistant is slow—try again!" });
    }
    return res.status(500).json({ error: "Internal server error: " + error.message });
  }
};
