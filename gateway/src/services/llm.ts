import type { Response } from 'express';

export const streamLLMResponse = async (prompt: string, res: Response): Promise<string> => {
    
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama3.2',
            prompt: prompt,
            stream: true
        })
    });

    if (!response.ok || !response.body) {
        throw new Error(`Ollama API returned an error`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullResponse = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
            const parsed = JSON.parse(line);
            fullResponse += parsed.response;

            res.write(`data: ${JSON.stringify({ text: parsed.response })}\n\n`);
        }
    }

    return fullResponse;
};