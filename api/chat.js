// Import necessary libraries
const fetch = require('node-fetch'); // Make sure you have this installed if you're using external APIs

module.exports = async (req, res) => {
    try {
        // Log the incoming request to see the body
        console.log("Received request body:", req.body);

        // Ensure that the body has the 'message' field
        const { message } = req.body;

        if (!message) {
            console.error("No message provided in the request.");
            return res.status(400).json({ error: "Message is required." });
        }

        // If you are using an AI API like OpenAI, add this here:
        const aiResponse = await processMessage(message); // Example function for AI processing

        console.log("AI Response:", aiResponse); // Log the response from AI
        
        return res.status(200).json({ response: aiResponse });
    } catch (error) {
        // Log the error for debugging
        console.error("Error processing request:", error);

        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Example AI function to simulate processing (replace with actual AI API call)
async function processMessage(message) {
    // Simulate AI processing, replace this with real API logic (e.g., OpenAI API)
    console.log("Processing message:", message);

    // In a real scenario, you'd call the AI API here (e.g., OpenAI)
    // For now, just echo the message back
    return `AI says: ${message}`;
}
