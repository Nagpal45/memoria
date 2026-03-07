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
        dotProduct += vecA[i]! * vecB[i]!;
        normA += vecA[i]! * vecA[i]!;
        normB += vecB[i]! * vecB[i]!;
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

const INTENT_ANCHORS = {
    CODE: [
        "Write a python script to reverse a string",
        "How do I debug a segmentation fault in C++?",
        "Explain React hooks to a beginner",
        "Docker compose file for Node and Redis",
        "Write a bash script to parse JSON",
        "What is the time complexity of quicksort?"
    ],
    MATH: [
        "Solve this differential equation",
        "Calculate the probability of drawing two aces",
        "Explain the Pythagorean theorem",
        "Convert this data into a JSON object",
        "Format this list as a structured array",
        "What is the integral of x^2?"
    ],
    CREATIVE: [
        "Write a story about a brave knight",
        "Compose a poem about the sea",
        "Brainstorm 5 ideas for a sci-fi novel",
        "Write a blog post about healthy eating",
        "Imagine a world where coffee is illegal"
    ],
    GENERAL: [
        "What is the capital of France?",
        "Who wrote To Kill a Mockingbird?",
        "Tell me a joke",
        "What's the weather like usually in London?",
        "Hi, how are you doing today?",
        "Summarize the history of Rome"
    ]
};

const intentCentroids: Record<string, number[]> = {};

// Helper to average multiple vectors to create a "centroid"
const calculateCentroid = (vectors: number[][]): number[] => {
    if (!vectors || vectors.length === 0) return [];
    const dimensions = vectors[0]!.length;
    const centroid = new Array(dimensions).fill(0);
    for (const vec of vectors) {
        for (let i = 0; i < dimensions; i++) {
            centroid[i] += vec[i]!;
        }
    }
    return centroid.map(val => val / vectors.length);
};

const loadIntentEmbeddings = async () => {
    if (Object.keys(intentCentroids).length > 0) return;
    try {
        console.log("Initializing semantic router anchor centroids...");
        for (const [intent, phrases] of Object.entries(INTENT_ANCHORS)) {
            // Generate embeddings for all example phrases
            const embeddings = await Promise.all(phrases.map(phrase => getEmbedding(phrase)));
            // Calculate the centroid (average) vector for the cluster
            intentCentroids[intent] = calculateCentroid(embeddings);
        }
        console.log("Centroids calculated successfully.");
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

    // Check cosine similarity against all anchor centroids
    for (const [intent, centroidVector] of Object.entries(intentCentroids)) {
        const sim = cosineSimilarity(vector, centroidVector);
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