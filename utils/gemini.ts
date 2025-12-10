import { GoogleGenerativeAI } from "@google/generative-ai";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Selects a chunk using weighted random sampling.
 * Unused chunks have 10x higher weight than used chunks.
 */
function selectWeightedRandomChunk(totalChunks: number, usedChunks: Set<number>): number {
    const weights: number[] = [];

    for (let i = 0; i < totalChunks; i++) {
        // Unused chunks get weight of 10, used chunks get weight of 1
        weights.push(usedChunks.has(i) ? 1 : 10);
    }

    // Calculate total weight
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // Pick a random number between 0 and totalWeight
    let random = Math.random() * totalWeight;

    // Find which chunk this corresponds to
    for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return i;
        }
    }

    // Fallback (should never reach here)
    return totalChunks - 1;
}

export async function generateSnippetsWithGemini(
    text: string,
    apiKey: string,
    numberOfSnippets: number = 20,
    fileId?: string // Optional: unique identifier for the file to track chunk usage
): Promise<string[]> {
    const CHUNK_SIZE = 30000;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        const selectedUserModel = await AsyncStorage.getItem("geminiModel");
        const modelName = selectedUserModel || "gemini-2.5-flash-lite";
        const model = genAI.getGenerativeModel({ model: modelName });

        console.log("Selected model:", selectedUserModel);

        // Calculate number of chunks
        const totalChunks = Math.ceil(text.length / CHUNK_SIZE);

        // Load used chunks for this file from AsyncStorage
        let usedChunks = new Set<number>();
        if (fileId) {
            const storageKey = `gemini_chunks_${fileId}`;
            const storedData = await AsyncStorage.getItem(storageKey);
            if (storedData) {
                const parsed = JSON.parse(storedData);
                usedChunks = new Set(parsed.usedChunks || []);
            }

            // If all chunks have been used, reset to empty (start over)
            if (usedChunks.size >= totalChunks) {
                console.log(`All ${totalChunks} chunks used for ${fileId}, resetting...`);
                usedChunks.clear();
            }
        }

        // Select a chunk using weighted random sampling
        const selectedChunk = totalChunks > 1
            ? selectWeightedRandomChunk(totalChunks, usedChunks)
            : 0;

        // Extract the selected chunk
        const startIndex = selectedChunk * CHUNK_SIZE;
        const endIndex = Math.min(startIndex + CHUNK_SIZE, text.length);
        const chunkText = text.substring(startIndex, endIndex);

        console.log(`Using chunk ${selectedChunk + 1}/${totalChunks} (chars ${startIndex}-${endIndex}) for fileId: ${fileId || 'unknown'}`);

        // Mark this chunk as used
        if (fileId) {
            usedChunks.add(selectedChunk);
            const storageKey = `gemini_chunks_${fileId}`;
            await AsyncStorage.setItem(storageKey, JSON.stringify({
                usedChunks: Array.from(usedChunks),
                totalChunks,
                lastUpdated: Date.now()
            }));
        }

        // Load snippet type preferences
        const savedPreferences = await AsyncStorage.getItem("snippetTypePreferences");
        const enabledTypes = savedPreferences ? JSON.parse(savedPreferences) : ['fact', 'concept', 'qna', 'true_false'];

        // Build type descriptions based on enabled types
        const typeDescriptions = [];
        const typesList = [];

        if (enabledTypes.includes('fact')) {
            typeDescriptions.push('- Interesting Facts ("Did you know...?") -> type: "fact"');
            typesList.push('"fact"');
        }
        if (enabledTypes.includes('concept')) {
            typeDescriptions.push('- Key Concepts defined simply. -> type: "concept"');
            typesList.push('"concept"');
        }
        if (enabledTypes.includes('qna')) {
            typeDescriptions.push('- Short Q&A ("Question: ... Answer: ...") -> type: "qna"');
            typesList.push('"qna"');
        }
        if (enabledTypes.includes('true_false')) {
            typeDescriptions.push('- True/False statements with explanation. -> type: "true_false"');
            typesList.push('"true_false"');
        }

        const doiaskforanswer = enabledTypes.includes('qna') || enabledTypes.includes('true_false');
        console.log("Doiaskforanswer:", doiaskforanswer);

        const prompt = `
        You are an expert tutor. Your goal is to help a student learn the following material by creating engaging, bite-sized learning snippets in the original language of the material (this is important).
        
        Please do not translate the material to another language.
        Material:
        "${chunkText}" 
        
        ${totalChunks > 1 ? `(Note: This is section ${selectedChunk + 1} of ${totalChunks} from a larger document)` : ''}

        Please generate ${numberOfSnippets} distinct, short, and engaging snippets in the original language of the material and based on this text.
        Mix the following types:
        ${typeDescriptions.join('\n        ')}

        Format the output as a JSON array of objects with this structure:
        {
            "type": ${typesList.join(' | ')},
            "content": "The main text, question, or statement in the original language of the material not the prompt. For Q&A, this is ONLY the question. Do NOT include the answer here.",
            ${!doiaskforanswer ? "" : "\"answer\": \"The answer or explanation (required for qna and true_false in the original language of the material not the prompt.)\","}
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
