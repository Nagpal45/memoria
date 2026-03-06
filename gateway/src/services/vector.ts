import dotenv from 'dotenv';
import { InferenceClient } from "@huggingface/inference";
dotenv.config();

const hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

export const getEmbedding = async (prompt: string): Promise<number[]> => {
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
        console.log('Generating embedding via Hugging Face SDK...');
        
        try {
            const output = await hf.featureExtraction({
                model: "BAAI/bge-small-en-v1.5",
                inputs: prompt,
            });

            return output as number[]; 

        } catch (error) {
            console.error('Cloud Embedding SDK Error:', error);
            throw error; 
        }

    } else {
        console.log('Generating embedding via Local Python Worker...');
        
        const response = await fetch('http://localhost:8000/embed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: prompt })
        });

        if (!response.ok) {
            throw new Error('Local Embedding Generation Failed');
        }

        const data = await response.json();
        return data.embedding;
    }
};