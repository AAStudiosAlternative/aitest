// api/chat.js

// Tell Vercel to use the Edge Runtime
export const runtime = "edge";
// Set a preferred region (Washington, D.C., USA) to minimize latency to Roblox servers
export const preferredRegion = "iad1";

export default async function handler(req) {
    const startTimeTotal = Date.now();
    console.log("Function execution started at:", new Date().toISOString());

    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        // Parse the request body safely
        let body;
        try {
            // First, try req.json() if available
            if (typeof req.json === "function") {
                console.log("Attempting to use req.json()");
                body = await req.json();
            } else {
                console.log("req.json() not available, trying req.body stream");
                // If req.json() isn't available, read the body as a stream
                if (!req.body) {
                    throw new Error("Request body is missing");
                }

                // Read the stream into a string
                const reader = req.body.getReader();
                const decoder = new TextDecoder();
                let bodyText = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    bodyText += decoder.decode(value, { stream: true });
                }

                // Parse the body text as JSON
                body = JSON.parse(bodyText);
            }
        } catch (error) {
            console.error("Error parsing request body:", error.message);
            return new Response(
                JSON.stringify({ error: "Invalid request body" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const { messages, identityInstruction } = body;

        if (!messages || !identityInstruction) {
            return new Response(
                JSON.stringify({ error: "Messages and identity instruction are required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Set up a timeout for the fetch request (4 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        try {
            console.log("Starting OpenRouter API call at:", new Date().toISOString());
            const startTimeApi = Date.now();

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

            const endTimeApi = Date.now();
            console.log("OpenRouter API call completed at:", new Date().toISOString());
            console.log("OpenRouter API call took:", (endTimeApi - startTimeApi) / 1000, "seconds");

            clearTimeout(timeoutId); // Clear the timeout if the request completes in time

            if (!openRouterResponse.ok) {
                const errorData = await openRouterResponse.json();
                throw new Error(errorData.error?.message || "OpenRouter API request failed");
            }

            const data = await openRouterResponse.json();
            const reply = data.choices[0].message.content;

            const endTimeTotal = Date.now();
            console.log("Function execution completed at:", new Date().toISOString());
            console.log("Total execution time:", (endTimeTotal - startTimeTotal) / 1000, "seconds");

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
