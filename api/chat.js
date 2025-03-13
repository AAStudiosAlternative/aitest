const fetch = require('node-fetch');

// Rate limiting variables
const requests = [];
const MAX_REQUESTS_PER_MINUTE = 20;
const MINUTE_MS = 60 * 1000;
const lastRequestTime = { time: 0 };
const SECOND_MS = 1000;

function cleanOldRequests() {
    const now = Date.now();
    while (requests.length > 0 && now - requests[0] > MINUTE_MS) {
        requests.shift();
    }
}

// Export the handler function for Vercel
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
            const now = Date.now();
            if (now - lastRequestTime.time < SECOND_MS) {
                res.status(429).json({ error: 'Slow down—only 1 message per second!' });
                return;
            }
            lastRequestTime.time = now;
            requests.push(now);

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
    const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
    if (!MISTRAL_API_KEY) throw new Error('Mistral API key not configured');

    if (/^#+$/.test(playerMessage) || /#/.test(playerMessage)) {
        return "Your message was moderated, please send a new one.";
    }

    const systemPrompt = "You are a helpful NPC in a Roblox game. Respond directly and politely to the player's message without adding humor, jokes, or unrelated topics. Keep answers short and appropriate for a family-friendly game.";
    const response = await fetch(
        'https://api.mistral.ai/v1/chat/completions',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'mistral-large-2411',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: playerMessage }
                ],
                max_tokens: 50,
            }),
        }
    );

    if (!response.ok) {
        if (response.status === 429) {
            return "Too many requests—slow down and try again!";
        }
        throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    let reply = data.choices[0].message.content || 'Something went wrong!';
    reply = reply.replace(/\n/g, ' ').trim();
    console.log('Mistral Reply:', reply);
    return reply;
}
