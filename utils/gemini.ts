import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateSnippetsWithGemini(text: string, apiKey: string): Promise<string[]> {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const prompt = `
        You are an expert tutor. Your goal is to help a student learn the following material by creating engaging, bite-sized learning snippets in the original language of the material not the prompt.
        
        Material:
        "${text.substring(0, 30000)}" 
        
        (Note: Text truncated to first 30k chars to fit context if needed)

        Please generate 20 distinct, short, and engaging snippets based on this text.
        Mix the following types:
        1. Interesting Facts ("Did you know...?")
        2. Key Concepts defined simply.
        3. Short Q&A ("Question: ... Answer: ...")
        4. True/False statements with explanation.

        All in the original language of the material that is provided.

        Format the output as a JSON array of objects, e.g., [{"type": "Fact", "snippet": "..."}]. 
        Do not include markdown formatting like \`\`\`json. Just the raw JSON array.
        Make sure each snippet is standalone and understandable without context.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();

        console.log("Gemini response:", textResponse);

        // Clean up potential markdown code blocks
        const cleanedText = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();

        const snippets = JSON.parse(cleanedText);

        if (Array.isArray(snippets)) {
            return snippets.map(s => {
                if (typeof s === 'string') return s;
                if (typeof s === 'object' && s !== null && 'snippet' in s) return s.snippet;
                return JSON.stringify(s);
            });
        } else {
            console.warn("Gemini response was not an array:", snippets);
            return [];
        }

    } catch (error) {
        console.error("Error generating snippets with Gemini:", error);
        return [];
    }
}
