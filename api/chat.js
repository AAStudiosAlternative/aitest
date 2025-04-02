const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        if (!req.body.message || !req.body.identityInstruction) {
            return res.status(400).json({ error: 'Message and identity instruction are required' });
        }

        const openRouterResponse = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "deepseek/deepseek-r1-distill-llama-8b",
                messages: [
                    { role: "system", content: req.body.identityInstruction },
                    { role: "user", content: req.body.message }
                ],
                max_tokens: 50,
                temperature: 0.7
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://aitest-dun.vercel.app", // Replace with your app's URL
                    "X-Title": "Elf AI Chat" // A descriptive title for your app
                }
            }
        );

        const reply = openRouterResponse.data.choices[0].message.content;
        res.json({ response: reply });
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            res.status(error.response.status).json({ error: error.response.data.error.message });
        } else if (error.code === 'ECONNABORTED') {
            res.status(504).json({ error: 'Request timed out' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

module.exports = router;
