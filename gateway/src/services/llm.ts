export const generateLLMResponse = async (prompt: string): Promise<string> => {
    try {
        console.log(`Sending prompt to local LLM (llama3.2)...`);
        
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2',
                prompt: prompt,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API returned status: ${response.status}`);
        }

        const data = await response.json();
        return data.response; 
    } catch (error) {
        console.error('Error generating LLM response:', error);
        throw new Error('Failed to communicate with LLM provider');
    }
};