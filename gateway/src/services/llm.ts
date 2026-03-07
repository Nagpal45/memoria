import type { Response } from 'express';
import Groq from 'groq-sdk';
import { InferenceClient } from '@huggingface/inference';
import type { ModelTarget } from './router.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY)


const attemptStream = async (prompt: string, target: ModelTarget, res: Response): Promise<string> => {
    let fullResponse = '';

    if (target === 'hf_coder') {
        const stream = hf.chatCompletionStream({
            model: "Qwen/Qwen2.5-Coder-7B-Instruct",
            messages: [{ role: 'user', content: prompt }],
        });
        for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || '';
            fullResponse += token;
            if (token) res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
        }
    }
    else if (target === 'cloud_llama_70b') {
        const stream = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile', 
            stream: true, 
        });
        for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || '';
            fullResponse += token;
            if (token) res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
        }
    } 
    else if (target === 'cloud_llama_8b') {
        const stream = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.1-8b-instant', 
            stream: true, 
        });
        for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || '';
            fullResponse += token;
            if (token) res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
        }
    }
    else if (target === 'local_llama3') {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'llama3.2', prompt: prompt, stream: true })
        });
        
        if (!response.ok || !response.body) throw new Error(`Ollama failed with status: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
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
    }

    return fullResponse;
};

import redisClient from './redis.js';

const ERROR_THRESHOLD = 3; 
const CIRCUIT_OPEN_SEC = 60; 

export const streamWithFallback = async (prompt: string, routeChain: ModelTarget[], res: Response): Promise<{ response: string, finalModel: string }> => {
    for (let i = 0; i < routeChain.length; i++) {
        const targetModel = routeChain[i];
        
        if (!targetModel) continue;

        const cbKeyOpen = `cb:open:${targetModel}`;
        const cbKeyFails = `cb:fails:${targetModel}`;
        
        try {
            // Check Circuit Breaker
            const isCircuitOpen = await redisClient.get(cbKeyOpen);
            if (isCircuitOpen) {
                console.warn(`[Circuit Breaker] Model ${targetModel} is currently DOWN. Skipping...`);
                res.write(`data: ${JSON.stringify({ event: 'fallback_triggered', failed_model: targetModel, next_model: routeChain[i+1], reason: 'circuit_breaker' })}\n\n`);
                continue; // Skip this model instantly
            }

            // console.log(`Attempting model (${i + 1}/${routeChain.length}): ${targetModel}...`);
            
            res.write(`data: ${JSON.stringify({ event: 'metadata', source: `llm_generated_${targetModel}` })}\n\n`);
            
            const generatedText = await attemptStream(prompt, targetModel, res);
            
            //Reset failure count.
            await redisClient.del(cbKeyFails);

            // console.log(`Success with ${targetModel}!`);
            return { response: generatedText, finalModel: targetModel }; 

        } catch (error: any) {
            console.error(`Model ${targetModel} failed:`, error.message);

            // Increment Failures
            const fails = await redisClient.incr(cbKeyFails);
            if (fails === 1) await redisClient.expire(cbKeyFails, 120); // Failure memory lasts 2 minutes

            if (fails >= ERROR_THRESHOLD) {
                console.error(`[Circuit Breaker] Model ${targetModel} failed ${fails} times. Opening circuit for ${CIRCUIT_OPEN_SEC}s.`);
                await redisClient.setEx(cbKeyOpen, CIRCUIT_OPEN_SEC, "true");
                await redisClient.del(cbKeyFails); // Reset count
            }
            
            if (i === routeChain.length - 1) {
                console.error('All fallback models exhausted. System offline.');
                throw new Error('All LLM providers failed.');
            }
            
            res.write(`data: ${JSON.stringify({ event: 'fallback_triggered', failed_model: targetModel, next_model: routeChain[i+1] })}\n\n`);
            // console.log(`Falling back to ${routeChain[i+1]}...`);
        }
    }

    throw new Error('Unexpected fallback failure');
};