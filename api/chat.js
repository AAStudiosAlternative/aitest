export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, identityInstruction } = req.body;

        if (!message || !identityInstruction) {
            return res.status(400).json({ error: 'Message and identity instruction are required' });
        }

        const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://aitest-dun.vercel.app",
                "X-Title": "Elf AI Chat"
            },
            body: JSON.stringify({
                model: "deepseek/deepseek-r1-distill-llama-8b",
                messages: [
                    { role: "system", content: identityInstruction },
                    { role: "user", content: message }
                ],
                max_tokens: 50,
                temperature: 0.7
            })
        });

        if (!openRouterResponse.ok) {
            const errorData = await openRouterResponse.json();
            throw new Error(errorData.error?.message || 'OpenRouter API request failed');
        }

        const data = await openRouterResponse.json();
        const reply = data.choices[0].message.content;
        res.status(200).json({ response: reply });
    } catch (error) {
        console.error('Error:', error.message);
        if (error.message.includes('timed out')) {
            res.status(504).json({ error: 'Request timed out' });
        } else {
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    }
}
