import crypto from 'crypto';
import redisClient from '../services/redis.js';
import type { Request, Response, NextFunction } from 'express';

export const checkExactCache = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { prompt } = req.body;
    
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
            console.log('Cache Hit (Redis Exact Match)');
            res.json({
                source: 'redis_cache',
                latency_ms: '< 5ms',
                response: JSON.parse(cachedResponse)
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