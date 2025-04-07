// api/chat.js

// Tell Vercel to use the Edge Runtime
export const runtime = "edge";
// Set a preferred region (Washington, D.C., USA) to minimize latency to Roblox servers
export const preferredRegion = "iad1";

export default async function handler(req) {
    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        const { messages, identityInstruction } = await req.json();

        if (!messages || !identityInstruction) {
            return new Response(
                JSON.stringify({ error: "Messages and identity instruction are required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Set up a timeout for the fetch request (8 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://aitest-dun.vercel.app",
                    "X-Title": "Elf AI Chat"
                },
                body: JSON.stringify({
                    model: "qwen/qwen-2.5-7b-instruct",
                    messages: [
                        { role: "system", content: identityInstruction },
                        ...messages // Include the conversation history
                    ],
                    max_tokens: 50, // Kept low to prevent timeouts
                    temperature: 0.7 // Kept low for faster responses
                }),
                signal: controller.signal // Attach the AbortController signal
            });

            clearTimeout(timeoutId); // Clear the timeout if the request completes in time

            if (!openRouterResponse.ok) {
                const errorData = await openRouterResponse.json();
                throw new Error(errorData.error?.message || "OpenRouter API request failed");
            }

            const data = await openRouterResponse.json();
            const reply = data.choices[0].message.content;
            return new Response(
                JSON.stringify({ response: reply }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error("Request timed out");
            }
            throw error; // Re-throw other errors
        }
    } catch (error) {
        console.error("Error:", error.message);
        if (error.message === "Request timed out") {
            return new Response(
                JSON.stringify({ error: "Elf AI is slow—try again!" }),
                { status: 504, headers: { "Content-Type": "application/json" } }
            );
        } else {
            return new Response(
                JSON.stringify({ error: error.message || "Internal server error" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
    }
}
