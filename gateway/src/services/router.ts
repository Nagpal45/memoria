import dotenv from 'dotenv';
dotenv.config();

export type ModelTarget = 'cloud_llama_70b' | 'cloud_llama_8b' | 'local_llama3';

export const determineRouteChain = (prompt: string): ModelTarget[] => {
    const isProd = process.env.NODE_ENV === 'production';
    const normalizedPrompt = prompt.toLowerCase();

    const requiresJSON = /json|array|object|structure format/.test(normalizedPrompt);
    const containsCodeSyntax = /```|function|const|let|=>|class|interface|npm install|react/.test(normalizedPrompt);
    const isMath = /calculate|equation|solve|derivative|math/.test(normalizedPrompt);

    if (containsCodeSyntax || requiresJSON || isMath) {
        // Primary: Smartest cloud model. 
        // Fallback 1: Fast cloud model. 
        // Fallback 2: Local model (if not in prod).
        return isProd 
            ? ['cloud_llama_70b', 'cloud_llama_8b'] 
            : ['cloud_llama_70b', 'cloud_llama_8b', 'local_llama3'];
    }

    const isCreative = /write a story|compose|essay|blog|creative/.test(normalizedPrompt);
    const isLongContext = prompt.length > 400;

    if (isCreative || isLongContext) {
        return isProd 
            ? ['cloud_llama_8b', 'cloud_llama_70b'] 
            : ['cloud_llama_8b', 'cloud_llama_70b', 'local_llama3'];
    }

    return isProd 
        ? ['cloud_llama_8b', 'cloud_llama_70b'] 
        : ['local_llama3', 'cloud_llama_8b']; 
};