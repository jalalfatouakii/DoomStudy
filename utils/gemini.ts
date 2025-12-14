import { GoogleGenerativeAI } from "@google/generative-ai";
import { apple } from "@react-native-ai/apple";
import { mlc } from "@react-native-ai/mlc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateText } from "ai";

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

async function generateSnippetsWithOfflineModel(
    text: string,
    modelId: string,
    numberOfSnippets: number = 20,
    fileId?: string
): Promise<string[]> {
    // Load chunk size from AsyncStorage (default: 2000 for offline)
    const savedChunkSize = await AsyncStorage.getItem("snippetChunkSize");
    const CHUNK_SIZE = savedChunkSize ? parseInt(savedChunkSize, 10) : 2000;

    // Load snippet count from AsyncStorage if not provided
    const savedSnippetCount = await AsyncStorage.getItem("snippetCount");
    const actualSnippetCount = savedSnippetCount ? parseInt(savedSnippetCount, 10) : numberOfSnippets;

    // Check if using Apple AI
    const isAppleAI = modelId === 'apple-intelligence';

    if (isAppleAI && !apple.isAvailable()) {
        console.warn("Apple AI is not available on this device");
        return [];
    }

    try {
        // Prepare MLC model if needed (Apple AI doesn't need preparation)
        let languageModel;
        if (!isAppleAI) {
            languageModel = mlc.languageModel(modelId);

            // Add timeout for prepare (15 seconds max - models can take time to load)
            const prepareTimeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Prepare timeout")), 120000);
            });

            try {
                await Promise.race([languageModel.prepare(), prepareTimeout]);
                console.log("Model prepared successfully");
            } catch (prepareError) {
                console.warn("Model prepare timed out or failed:", prepareError);
                // Try to continue anyway - model might already be prepared
                console.log("Attempting to generate anyway...");
            }
        } else {
            languageModel = apple.languageModel();
            console.log("Using Apple AI (no preparation needed)");
        }

        // Calculate number of chunks
        const totalChunks = Math.ceil(text.length / CHUNK_SIZE);

        // Load used chunks for this file from AsyncStorage
        let usedChunks = new Set<number>();
        if (fileId) {
            const storageKey = `offline_chunks_${fileId}`;
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
            const storageKey = `offline_chunks_${fileId}`;
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

        const needsAnswer = enabledTypes.includes('qna') || enabledTypes.includes('true_false');

        // Use full prompt with user preferences for Apple AI (more powerful)
        // Use simple prompt for MLC models (less powerful)
        const textSnippet = chunkText;
        const prompt = isAppleAI ? `
        You are an expert tutor. Your goal is to help a student learn the following material by creating engaging, bite-sized learning snippets in the original language of the material (this is important).
        
        Please do not translate the material to another language.
        Material:
        "${textSnippet}" 
        
        ${totalChunks > 1 ? `(Note: This is section ${selectedChunk + 1} of ${totalChunks} from a larger document)` : ''}

        Please generate ${actualSnippetCount} distinct, short, and engaging snippets in the original language of the material and based on this text.
        Mix the following types:
        ${typeDescriptions.join('\n        ')}

        Format the output as a JSON array of objects with this structure:
        {
            "type": ${typesList.join(' | ')},
            "content": "The main text, question, or statement in the original language of the material not the prompt. For Q&A, this is ONLY the question. Do NOT include the answer here.",
            ${!needsAnswer ? "" : "\"answer\": \"The answer or explanation (required for qna and true_false in the original language of the material not the prompt.)\","}
            "label": "Optional label like 'Did you know?' or 'Key Concept' like the type, don't add extra text"
        }
        All in the original language of the material that is provided.

        Do not include markdown formatting like \`\`\`json. Just the raw JSON array.
        Make sure each snippet is standalone and understandable without context.
        ` : `You are an expert tutor. Your goal is to help a student learn the following material by creating engaging, bite-sized learning snippets in the original language of the material (this is important).

Material: "${textSnippet}"

Create ${actualSnippetCount} learning snippets. Output ONLY a JSON array, no other text, no markdown, no explanations. Format: [{"type":"fact","content":"..."},{"type":"fact","content":"..."},{"type":"fact","content":"..."}]`;

        console.log("Starting offline model generation");

        // Add timeout wrapper (8 seconds max for generation)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Timeout")), 60000);
        });

        let result;
        try {
            result = await Promise.race([
                generateText({
                    model: languageModel as any,
                    prompt: prompt,
                }),
                timeoutPromise
            ]) as any;
        } catch (timeoutError) {
            console.warn("Offline model generation timed out, returning empty");
            return [];
        }

        const textResponse = result?.text;
        console.log("Offline model response:", textResponse);

        // Check if response is empty
        if (!textResponse || textResponse.trim().length === 0) {
            return [];
        }

        // Clean up potential markdown code blocks (like Gemini does)
        let cleanedText = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();

        // Try to extract all JSON arrays from the response
        const allSnippets: any[] = [];

        // Find all JSON arrays using regex
        const arrayMatches = cleanedText.matchAll(/\[[\s\S]*?\]/g);
        for (const match of arrayMatches) {
            try {
                const parsed = JSON.parse(match[0]);
                if (Array.isArray(parsed)) {
                    allSnippets.push(...parsed);
                }
            } catch (e) {
                // Skip invalid arrays
            }
        }

        // Also try to find single JSON objects
        const objectMatches = cleanedText.matchAll(/\{[\s\S]*?\}/g);
        for (const match of objectMatches) {
            try {
                const parsed = JSON.parse(match[0]);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    allSnippets.push(parsed);
                }
            } catch (e) {
                // Skip invalid objects
            }
        }

        // If we found snippets, validate and return them
        if (allSnippets.length > 0) {
            return allSnippets.slice(0, actualSnippetCount).map(s => {
                // Ensure it's a valid object structure (like Gemini does)
                if (typeof s === 'object' && s !== null && 'content' in s) {
                    const snippet: any = {
                        type: s.type || 'fact',
                        content: s.content || String(s),
                        label: s.label || 'Learning Point'
                    };
                    // Preserve answer field if present
                    if (s.answer) {
                        snippet.answer = s.answer;
                    }
                    return JSON.stringify(snippet);
                }
                // Fallback for simple strings or malformed objects
                if (typeof s === 'string') {
                    return JSON.stringify({ type: 'fact', content: s, label: 'Learning Point' });
                }
                return JSON.stringify({ type: 'fact', content: String(s), label: 'Learning Point' });
            });
        }

        // Final fallback: try parsing the whole cleaned text as JSON
        try {
            const parsed = JSON.parse(cleanedText);
            if (Array.isArray(parsed)) {
                return parsed.slice(0, actualSnippetCount).map(s => {
                    if (typeof s === 'object' && s !== null && 'content' in s) {
                        const snippet: any = {
                            type: s.type || 'fact',
                            content: s.content || String(s),
                            label: s.label || 'Learning Point'
                        };
                        // Preserve answer field if present
                        if (s.answer) {
                            snippet.answer = s.answer;
                        }
                        return JSON.stringify(snippet);
                    }
                    return JSON.stringify({ type: 'fact', content: String(s), label: 'Learning Point' });
                });
            }
        } catch (e) {
            // Last resort: create simple snippets from text
            const fallbackLines = textResponse.split(/[.!?]/).filter((l: string) => l.trim().length > 20);
            return fallbackLines.slice(0, actualSnippetCount).map((line: string, idx: number) => JSON.stringify({
                type: 'fact',
                content: line.trim(),
                label: 'Learning Point'
            }));
        }

        return [];


    } catch (error) {
        console.error("Error generating snippets with offline model:", error);
        return [];
    }
}

export async function generateSnippetsWithGemini(
    text: string,
    apiKey: string,
    numberOfSnippets: number = 20,
    fileId?: string // Optional: unique identifier for the file to track chunk usage
): Promise<string[]> {
    // Load chunk size from AsyncStorage (default: 30000 for online)
    const savedChunkSize = await AsyncStorage.getItem("snippetChunkSize");
    const CHUNK_SIZE = savedChunkSize ? parseInt(savedChunkSize, 10) : 30000;

    // Load snippet count from AsyncStorage if not provided
    const savedSnippetCount = await AsyncStorage.getItem("snippetCount");
    const actualSnippetCount = savedSnippetCount ? parseInt(savedSnippetCount, 10) : numberOfSnippets;

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

        Please generate ${actualSnippetCount} distinct, short, and engaging snippets in the original language of the material and based on this text.
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

/**
 * Unified function that generates snippets based on the selected mode (online/offline)
 */
export async function generateSnippets(
    text: string,
    apiKey: string,
    numberOfSnippets: number = 20,
    fileId?: string
): Promise<string[]> {
    try {
        // Check the mode preference
        const modePreference = await AsyncStorage.getItem("modelModePreference");
        const mode = modePreference === 'offline' ? 'offline' : 'online';

        if (mode === 'offline') {
            // Check if an offline model is selected and downloaded (or Apple AI)
            const selectedOfflineModel = await AsyncStorage.getItem("selectedOfflineModel");
            const downloadedModelsStr = await AsyncStorage.getItem("downloadedOfflineModels");
            const downloadedModels = downloadedModelsStr ? JSON.parse(downloadedModelsStr) : [];
            const isAppleAI = selectedOfflineModel === 'apple-intelligence';

            if (selectedOfflineModel && (downloadedModels.includes(selectedOfflineModel) || isAppleAI)) {
                if (isAppleAI && !apple.isAvailable()) {
                    console.log("Apple AI selected but not available, falling back to Gemini");
                    return await generateSnippetsWithGemini(text, apiKey, numberOfSnippets, fileId);
                }
                console.log(`Using offline model: ${selectedOfflineModel}`);
                return await generateSnippetsWithOfflineModel(text, selectedOfflineModel, numberOfSnippets, fileId);
            } else {
                console.log("Offline mode selected but no model downloaded, falling back to Gemini");
                // Fallback to Gemini if offline model not available
                return await generateSnippetsWithGemini(text, apiKey, numberOfSnippets, fileId);
            }
        } else {
            // Online mode - use Gemini
            console.log("Using Gemini (online mode)");
            return await generateSnippetsWithGemini(text, apiKey, numberOfSnippets, fileId);
        }
    } catch (error) {
        console.error("Error in generateSnippets:", error);
        // Fallback to Gemini on any error
        return await generateSnippetsWithGemini(text, apiKey, numberOfSnippets, fileId);
    }
}
