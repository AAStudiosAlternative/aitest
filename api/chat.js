const fetch = require('node-fetch');

module.exports = async (req, res) => {
    console.log('Request method:', req.method); // Log the HTTP method (GET or POST)
    console.log('Request headers:', req.headers); // Log request headers
    console.log('Request body:', req.body); // Log the body of the request

    try {
        // Ensure we are receiving a POST request
        if (req.method !== 'POST') {
            return res.status(405).json({ error: "Only POST requests are allowed" });
        }

        const { message } = req.body;
        if (!message) {
            console.error("No message received in request.");
            return res.status(400).json({ error: "Message is required" });
        }

        // Log the received message
        console.log('Received message:', message);

        // Simulate an AI response (Replace this with actual API integration)
        const aiResponse = await processMessage(message);

        // Log AI response
        console.log('AI Response:', aiResponse);

        return res.status(200).json({ response: aiResponse });

    } catch (error) {
        console.error("Error processing the request:", error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Simulate AI response (replace with actual AI API integration)
async function processMessage(message) {
    console.log('Processing message:', message);
    
    // If you have an AI service like OpenAI, replace this code with the actual API call
    // For now, we're just simulating the response.
    return `AI Response to: ${message}`;
}
