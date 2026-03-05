import express from "express";
import redisClient, { connectRedis } from "./services/redis.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { checkExactCache } from "./middleware/cache.js";
import dotenv from 'dotenv';
import { initDB } from "./services/postgres.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/', rateLimiter);

// placeholder route
app.post('/api/generate', checkExactCache, async (req, res) => {
    const { prompt, cacheKey } = req.body;
    
    console.log('Cache Miss. Forwarding to LLM worker...');
    
    setTimeout(async () => {
        const generatedResponse = `This is the expensive, AI-generated answer for: "${prompt}"`;
        
        if (cacheKey) {
            await redisClient.setEx(cacheKey, 3600, JSON.stringify(generatedResponse));
        }

        res.json({ 
            source: 'llm_generated',
            latency_ms: '~2000ms',
            response: generatedResponse 
        });
    }, 2000);
});

const startServer = async () => {
  await connectRedis ();
  await initDB();
  app.listen(PORT, () => {
    console.log(`Memoria Gateway is running on port ${PORT}`);
  });
};

startServer();