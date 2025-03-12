const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            const { message } = req.body;
            if (!message) throw new Error('No message provided');
            const aiResponse = await getAIResponse(message);
            res.setHeader("Access-Control-Allow-Origin", "*"); // Safety
            res.status(200).json({ response: aiResponse });
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).json({ error: 'Failed to fetch AI response' });
        }
    } else {
        res.status(405).json({ error: 'Method Not Allowed' });
    }
};

async function getAIResponse(playerMessage) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Set in Vercel env vars
    if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are a friendly elf NPC in a Roblox game.' },
                { role: 'user', content: playerMessage },
            ],
            max_tokens: 50, // Low cost, short replies
            temperature: 0.7, // Balanced tone
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('AI Response:', data);
    return data.choices[0].message.content || 'AI is not responding properly.';
}
