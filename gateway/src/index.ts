import express from "express";
import redisClient, { connectRedis } from "./services/redis.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { checkExactCache } from "./middleware/cache.js";
import dotenv from 'dotenv';
import pool, { initDB } from "./services/postgres.js";
import { checkSemanticCache } from "./middleware/semanticCache.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/', rateLimiter);

// placeholder route
app.post(
    '/api/generate', 
    checkExactCache,       //L1
    checkSemanticCache,    //L2
    async (req, res) => {
        const { prompt, cacheKey, embedding } = req.body;
        console.log('L2 Miss. Forwarding to expensive LLM...');
        
        setTimeout(async () => {
            const generatedResponse = `This is the AI-generated answer for: "${prompt}"`;

            if (cacheKey) {
                await redisClient.setEx(cacheKey, 3600, JSON.stringify(generatedResponse));
            }

            if (embedding) {
                const insertQuery = `
                    INSERT INTO semantic_cache (prompt, embedding, response) 
                    VALUES ($1, $2, $3);
                `;
                await pool.query(insertQuery, [prompt, embedding, generatedResponse]);
            }

            res.json({ 
                source: 'llm_generated',
                latency_ms: '~2000ms',
                response: generatedResponse 
            });
        }, 2000);
    }
);

const startServer = async () => {
  await connectRedis ();
  await initDB();
  app.listen(PORT, () => {
    console.log(`Memoria Gateway is running on port ${PORT}`);
  });
};

startServer();