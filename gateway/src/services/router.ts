import dotenv from 'dotenv';
import { getEmbedding } from './vector.js';
dotenv.config();

export type ModelTarget = 'hf_coder' | 'cloud_llama_70b' | 'cloud_llama_8b' | 'local_llama3';

const cosineSimilarity = (vecA: number[], vecB: number[]) => {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

const INTENT_ANCHORS = {
    CODE: "Write code, programming, bash script, debug errors, typescript, react, devops, docker, kubernetes, software engineering, function, syntax",
    MATH: "JSON output, structured data, arrays, objects, calculate math equations, solve math problems, calculus, algebra, formatting",
    CREATIVE: "Write a story, compose an essay, creative writing, brainstorm ideas, blog post, fictional, imaginative narrative",
    GENERAL: "General knowledge, answering simple questions, chatting, everyday topics, casual conversation"
};

const intentEmbeddings: Record<string, number[]> = {};

const loadIntentEmbeddings = async () => {
    if (Object.keys(intentEmbeddings).length > 0) return;
    try {
        console.log("Initializing semantic router anchor embeddings...");
        intentEmbeddings.CODE = await getEmbedding(INTENT_ANCHORS.CODE);
        intentEmbeddings.MATH = await getEmbedding(INTENT_ANCHORS.MATH);
        intentEmbeddings.CREATIVE = await getEmbedding(INTENT_ANCHORS.CREATIVE);
        intentEmbeddings.GENERAL = await getEmbedding(INTENT_ANCHORS.GENERAL);
    } catch (e) {
        console.error("Failed to load intent embeddings:", e);
    }
};

export const determineRouteChain = async (prompt: string, vector?: number[]): Promise<ModelTarget[]> => {
    const isProd = process.env.NODE_ENV === 'production';
    
    // Always rely on length for creative threshold fallback if needed
    const isLongContext = prompt.length > 400;

    if (!vector) {
        // Fallback to regex if no vector is provided
        const normalizedPrompt = prompt.toLowerCase();
        if (normalizedPrompt.match(/(bash|docker|aws|script|react|typescript|kubernetes|devops|code)/)) {
            return isProd ? ['hf_coder', 'cloud_llama_70b', 'cloud_llama_8b'] : ['hf_coder', 'cloud_llama_70b', 'local_llama3'];
        }
        if (/json|array|object|structure format|```|function|const|let|=>|class|interface|npm|react|calculate|equation|solve|math/.test(normalizedPrompt)) {
            return isProd ? ['cloud_llama_70b', 'cloud_llama_8b'] : ['cloud_llama_70b', 'cloud_llama_8b', 'local_llama3'];
        }
        if (/write a story|compose|essay|blog|creative/.test(normalizedPrompt) || isLongContext) {
            return isProd ? ['cloud_llama_8b', 'cloud_llama_70b'] : ['cloud_llama_8b', 'cloud_llama_70b', 'local_llama3'];
        }
        return isProd ? ['cloud_llama_8b', 'cloud_llama_70b'] : ['local_llama3', 'cloud_llama_8b'];
    }

    // Ensure embeddings are loaded
    await loadIntentEmbeddings();

    let bestIntent = "GENERAL";
    let highestSimilarity = -1;

    // Check cosine similarity against all anchors
    for (const [intent, anchorVector] of Object.entries(intentEmbeddings)) {
        const sim = cosineSimilarity(vector, anchorVector);
        if (sim > highestSimilarity) {
            highestSimilarity = sim;
            bestIntent = intent;
        }
    }

    // console.log(`[Router] Mapped to intent: ${bestIntent} with score: ${highestSimilarity.toFixed(3)}`);

    switch (bestIntent) {
        case "CODE":
            return isProd 
                ? ['hf_coder', 'cloud_llama_70b', 'cloud_llama_8b'] 
                : ['hf_coder', 'cloud_llama_70b', 'local_llama3'];
        case "MATH":
            return isProd 
                ? ['cloud_llama_70b', 'cloud_llama_8b'] 
                : ['cloud_llama_70b', 'cloud_llama_8b', 'local_llama3'];
        case "CREATIVE":
            return isProd 
                ? ['cloud_llama_8b', 'cloud_llama_70b'] 
                : ['cloud_llama_8b', 'cloud_llama_70b', 'local_llama3'];
        default: // GENERAL
            if (isLongContext) {
                return isProd 
                    ? ['cloud_llama_8b', 'cloud_llama_70b'] 
                    : ['cloud_llama_8b', 'cloud_llama_70b', 'local_llama3'];
            }
            return isProd 
                ? ['cloud_llama_8b', 'cloud_llama_70b'] 
                : ['local_llama3', 'cloud_llama_8b'];
    }
};