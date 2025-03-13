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
