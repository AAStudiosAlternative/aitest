// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, identityInstruction } = req.body;

        if (!messages || !identityInstruction) {
            return res.status(400).json({ error: 'Messages and identity instruction are required' });
        }

        // Set up a timeout for the fetch request (4 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        try {
            console.log("Starting OpenRouter API call (meta-llama/llama-3-8b-instruct:nitro) at:", new Date().toISOString());
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
                    model: "meta-llama/llama-3-8b-instruct:fastest", // Switch to Llama 3 8B Instruct with :nitro for fastest provider
                    messages: [
                        { role: "system", content: identityInstruction },
                        ...messages // Include the conversation history
                    ],
                    max_tokens: 100, // Kept low to prevent timeouts
                    temperature: 0.7 // Kept low for faster responses
                }),
                signal: controller.signal // Attach the AbortController signal
            });

            const endTimeApi = Date.now();
            console.log("OpenRouter API call (meta-llama/llama-3-8b-instruct:nitro) completed at:", new Date().toISOString());
            console.log("OpenRouter API call took:", (endTimeApi - startTimeApi) / 1000, "seconds");

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
