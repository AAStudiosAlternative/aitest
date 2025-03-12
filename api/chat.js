const fetch = require('node-fetch');

// Simple rate limiter (20 requests/minute)
const requests = [];
const MAX_REQUESTS_PER_MINUTE = 20;
const MINUTE_MS = 60 * 1000;

function cleanOldRequests() {
    const now = Date.now();
    while (requests.length > 0 && now - requests[0] > MINUTE_MS) {
        requests.shift();
    }
}

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            const { message } = req.body;
            if (!message) throw new Error('No message provided');

            cleanOldRequests();
            if (requests.length >= MAX_REQUESTS_PER_MINUTE) {
                res.status(429).json({ error: 'Too many requests, wait a minute!' });
                return;
            }
            requests.push(Date.now());

            const aiResponse = await getAIResponse(message);
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.status(200).json({ response: aiResponse });
        } catch (error) {
            console.error('Error:', error.message);
            res.status(504).json({ error: 'Assistant is offline, try again soon!' });
        }
    } else {
        res.status(405).json({ error: 'Method Not Allowed' });
    }
};

async function getAIResponse(playerMessage) {
    const HF_API_KEY = process.env.HF_API_KEY;
    if (!HF_API_KEY) throw new Error('Hugging Face API key not configured');

    const assistantPrompt = `I'm your assistant. ${playerMessage}`;
    async function tryFetch() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds

        try {
            const response = await fetch(
                'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${HF_API_KEY}`,
                    },
                    body: JSON.stringify({ inputs: assistantPrompt }),
                    signal: controller.signal,
                }
            );
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out after 8 seconds');
            }
            throw error;
        }
    }

    // First attempt
    let response = await tryFetch();
    if (response.status === 503) {
        console.log('503 detected, retrying in 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        response = await tryFetch(); // Retry (total ~9s, under 10s)
    }

    if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('AI Response:', data);
    let reply = data[0].generated_text || 'I’m here to assist, but the system’s down!';
    if (reply.startsWith("I'm your assistant. ")) {
        reply = reply.slice(19);
    }
    return reply;
}
