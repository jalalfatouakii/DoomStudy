import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateSnippetsWithGemini(text: string, apiKey: string, numberOfSnippets: number = 20): Promise<string[]> {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const prompt = `
        You are an expert tutor. Your goal is to help a student learn the following material by creating engaging, bite-sized learning snippets in the original language of the material (this is important).
        
        Please do not translate the material to another language.
        Material:
        "${text.substring(0, 30000)}" 
        
        (Note: Text truncated to first 30k chars to fit context if needed)

        Please generate ${numberOfSnippets} distinct, short, and engaging snippets in the original language of the material and based on this text.
        Mix the following types:
        1. Interesting Facts ("Did you know...?") -> type: "fact"
        2. Key Concepts defined simply. -> type: "concept"
        3. Short Q&A ("Question: ... Answer: ...") -> type: "qna"
        4. True/False statements with explanation. -> type: "true_false"

        Format the output as a JSON array of objects with this structure:
        {
            "type": "fact" | "concept" | "qna" | "true_false",
            "content": "The main text, question, or statement in the original language of the material not the prompt. For Q&A, this is ONLY the question. Do NOT include the answer here.",
            "answer": "The answer or explanation (required for qna and true_false in the original language of the material not the prompt.)",
            "label": "Optional label like 'Did you know?' or 'Key Concept' like the type, don't add extra text"
        }
        All in the original language of the material that is provided.

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
                // Ensure it's a valid object structure, otherwise fallback
                if (typeof s === 'object' && s !== null && 'content' in s) {
                    return JSON.stringify(s);
                }
                // Fallback for simple strings or malformed objects
                if (typeof s === 'string') return s;
                return JSON.stringify({ type: 'text', content: String(s) });
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
