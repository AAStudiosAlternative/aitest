export default async (req, res) => {
  // Check for correct HTTP method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Validate request body
  const { message, username, userId } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing "message" in request body.' });
  }

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing "username" in request body.' });
  }

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing "userId" in request body.' });
  }

  // Log the input to Discord webhook
  const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1350648002137686047/gcLRbI5UtzhrpX3PPb2xdPwyD4U00FIwV7p-tmT7vyzVvO9Wfwq9Ys_5vBN69irbdgck";
  try {
    const webhookPayload = {
      username: `${username} (ID: ${userId})`, // Set the webhook's display name to "username (ID: userId)"
      content: `**Input:** ${message}`
    };

    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(webhookPayload)
    });
  } catch (error) {
    console.error("Failed to send to Discord webhook:", error.message);
    // Don't fail the request if webhook logging fails; just log the error
  }

  // Proceed with OpenRouter request
  try {
    const payload = {
      model: "qwen/qwen-2.5-7b-instruct:floor", // Prioritize lowest price (likely DeepInfra)
      messages: [
        { role: "system", content: "Respond concisely, limiting answers to 1-2 short sentences." },
        { role: "user", content: message }
      ],
      max_tokens: 50 // Limit the response to 50 tokens
    };

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

    const data = await response.json();
    const assistantResponse = data.choices?.[0]?.message?.content;

    if (!assistantResponse) {
      console.error("Unexpected OpenRouter response format:", JSON.stringify(data, null, 2));
      return res.status(500).json({ error: "Invalid response format from OpenRouter." });
    }

    res.status(200).json({ response: assistantResponse });
  } catch (error) {
    console.error("Error in Vercel API:", error.message);
    if (error.message.includes("fetch")) {
      return res.status(503).json({ error: "Assistant is slow—try again!" });
    }
    return res.status(500).json({ error: "Internal server error: " + error.message });
  }
};
