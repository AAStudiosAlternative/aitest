const fetch = require('node-fetch');

async function getAIResponse(playerMessage) {
    const response = await fetch('https://aitest-dun.vercel.app/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: playerMessage
        }),
    });

    const data = await response.json();
    console.log('AI Response:', data);  // Debug line to print the full response
    return data.response || 'AI is not responding properly.';
}

// Example usage:
getAIResponse('Hello').then(response => console.log(response));
