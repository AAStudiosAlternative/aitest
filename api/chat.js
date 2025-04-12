// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Utility function to trim spaces, newlines, and other whitespace
    const trim = (str) => {
        if (!str) return "";
        return str
            .trim() // Remove leading/trailing whitespace
            .replace(/\s+/g, " "); // Reduce multiple spaces to a single space
    };

    try {
        const { messages, identityInstruction } = req.body;

        if (!messages || !identityInstruction) {
            return res.status(400).json({ error: 'Messages and identity instruction are required' });
        }

        // Extract the latest user message (prompt) and username (if provided)
        const userMessage = messages[messages.length - 1].content;
        const robloxUsername = req.body.robloxUsername || "Unknown"; // Expect username from Roblox script

        // Set up a timeout for the fetch request (4 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        console.log("Starting OpenRouter API call (google/gemma-2-9b-it:nitro) at:", new Date().toISOString());
        const startTimeApi = Date.now();

        const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://aitest-dun.vercel.app",
                "X-Title": "Elf AI Chat"
            },
            body: JSON.stringify({
                model: "google/gemma-2-9b-it:nitro",
                messages: [
                    { role: "system", content: identityInstruction },
                    ...messages
                ],
                max_tokens: 100,
                temperature: 0.7
            }),
            signal: controller.signal
        });

        const endTimeApi = Date.now();
        console.log("OpenRouter API call took:", (endTimeApi - startTimeApi) / 1000, "seconds");
        clearTimeout(timeoutId);

        if (!openRouterResponse.ok) {
            const errorData = await openRouterResponse.json();
            throw new Error(errorData.error?.message || 'OpenRouter API request failed');
        }

        const data = await openRouterResponse.json();
        let reply = data.choices[0].message.content;

        // Trim the reply to remove extra spaces and newlines
        reply = trim(reply);
        console.log("Trimmed API response:", reply);

        // Send to Discord webhook
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL; // Add your webhook URL to .env
        if (webhookUrl) {
            try {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        embeds: [{
                            title: "Elf AI Chat Log",
                            color: 0x00FF00, // Green color
                            fields: [
                                { name: "Roblox Username", value: robloxUsername, inline: true },
                                { name: "Prompt", value: userMessage || "N/A", inline: false },
                                { name: "Output", value: reply || "N/A", inline: false }
                            ],
                            timestamp: new Date().toISOString()
                        }]
                    })
                });
                console.log("Webhook sent successfully");
            } catch (webhookError) {
                console.error("Failed to send webhook:", webhookError.message);
            }
        } else {
            console.warn("DISCORD_WEBHOOK_URL not set in environment variables");
        }

        res.status(200).json({ response: reply });
    } catch (error) {
        console.error('Error:', error.message);
        if (error.name === 'AbortError') {
            res.status(504).json({ error: 'Elf AI is slow—try again!' });
        } else {
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    }
}
