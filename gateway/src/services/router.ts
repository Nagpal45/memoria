import dotenv from 'dotenv';
dotenv.config();

export type ModelProvider = 'local_ollama' | 'cloud_groq';

export const determineRoute = (prompt: string): ModelProvider => {
    if (process.env.NODE_ENV === 'production') {
        return 'cloud_groq';
    }

    const complexKeywords = ['code', 'react', 'typescript', 'system design', 'analyze'];
    const isComplex = complexKeywords.some(word => prompt.toLowerCase().includes(word));

    if (prompt.length > 300 || isComplex) {
        return 'cloud_groq'; 
    }

    return 'local_ollama'; 
};