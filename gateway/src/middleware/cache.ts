import crypto from 'crypto';
import redisClient from '../services/redis.js';
import type { Request, Response, NextFunction } from 'express';
import { logTelemetry } from '../services/telemetry.js';

export const checkExactCache = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { prompt } = req.body;
    const startTime = Date.now();
    
    if (!prompt) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
    }

    const normalizedPrompt = prompt.toLowerCase().trim();
    const hash = crypto.createHash('sha256').update(normalizedPrompt).digest('hex');
    const cacheKey = `prompt:${hash}`;

    try {
        const cachedResponse = await redisClient.get(cacheKey);
        
        if (cachedResponse) {
            const latency = Date.now() - startTime;
            const parsedResponse = JSON.parse(cachedResponse);
            console.log('Cache Hit (Redis Exact Match)');
            res.json({
                source: 'redis_cache',
                latency_ms: '< 5ms',
                response: parsedResponse
            });

            logTelemetry({
                prompt,
                latency_ms: latency,
                response: parsedResponse,
                source: 'redis_cache'
            });

            return;
        }
        
        req.body.cacheKey = cacheKey;
        next();
        
    } catch (error) {
        console.error('Redis Cache Error:', error);
        next();
    }
};