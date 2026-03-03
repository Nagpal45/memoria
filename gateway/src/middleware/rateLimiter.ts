import type { NextFunction, Request, Response } from "express";
import redisClient from "../services/redis.js";

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    const limit = 10;
    const windowInSeconds = 60;

    try{
        const requests = await redisClient.incr(ip);

        if (requests === 1) {
            await redisClient.expire(ip, windowInSeconds);
        }

        if (requests > limit) {
            res.status(429).json({ message: 'Too many requests. Please try again in a minute.', status: 429 });
            return;
        }
        next();
    }catch (err) {
        console.error('Error in rate limiter:', err);
        next();
    }
};