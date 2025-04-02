export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, identityInstruction } = req.body;

        if (!message || !identityInstruction) {
            return res.status(400).json({ error: 'Message and identity instruction are required' });
        }

        // Set up a timeout for the fetch request (8 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
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
                    max_tokens: 50, // Reduced to make the response faster
                    temperature: 0.7 // Lowered for more predictable (and potentially faster) output
                }),
                signal: controller.signal // Attach the AbortController signal
            });

            clearTimeout(timeoutId); // Clear the timeout if the request completes in time

            if (!openRouterResponse.ok) {
                const errorData = await openRouterResponse.json();
                throw new Error(errorData.error?.message || 'OpenRouter API request failed');
            }

            const data = await openRouterResponse.json();
            const reply = data.choices[0].message.content;
            res.status(200).json({ response: reply });
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            throw error; // Re-throw other errors
        }
    } catch (error) {
        console.error('Error:', error.message);
        if (error.message === 'Request timed out') {
            res.status(504).json({ error: 'Elf AI is slow—try again!' });
        } else {
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    }
}
