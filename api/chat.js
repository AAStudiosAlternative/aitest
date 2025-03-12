const fetch = require('node-fetch');

// The exported function that Vercel uses to handle HTTP requests
module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            // Extract the player's message from the request body
            const { message } = req.body;

            // Fetch AI response from the API
            const aiResponse = await getAIResponse(message);

            // Send the AI response back to the client
            res.status(200).json({ response: aiResponse });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Failed to fetch AI response' });
        }
    } else {
        // If the request method is not POST, return an error
        res.status(405).json({ error: 'Method Not Allowed' });
    }
};

// Function to get AI response
async function getAIResponse(playerMessage) {
    const response = await fetch('https://aitest-dun.vercel.app/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: playerMessage }),
    });

    const data = await response.json();
    console.log('AI Response:', data); // Debug the response
    return data.response || 'AI is not responding properly.';
}
