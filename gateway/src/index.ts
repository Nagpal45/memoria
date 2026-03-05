import express from "express";
import redisClient, { connectRedis } from "./services/redis.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { checkExactCache } from "./middleware/cache.js";
import dotenv from 'dotenv';
import pool, { initDB } from "./services/postgres.js";
import { checkSemanticCache } from "./middleware/semanticCache.js";
import { generateLLMResponse } from "./services/llm.js";
import { logTelemetry } from "./services/telemetry.js";
import { connectMongo } from "./services/mongo.js";
import { validatePayload } from "./middleware/validate.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/', rateLimiter);

app.post(
    '/api/generate', 
    validatePayload,
    checkExactCache,       // L1: Redis
    checkSemanticCache,    // L2: Postgres + Python
    async (req, res) => {
        const { prompt, cacheKey, embedding } = req.body;
        
        try {
            const startTime = Date.now();
            
            const generatedResponse = await generateLLMResponse(prompt);
            
            const latency = Date.now() - startTime;
            console.log(`LLM Generation Complete in ${latency}ms`);

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
                latency_ms: `${latency}ms`,
                response: generatedResponse 
            });

            logTelemetry({
                prompt,
                latency_ms: latency,
                response: generatedResponse,
                source: 'llm_generated'
            });

        } catch (error) {
            res.status(500).json({ error: 'LLM Generation Failed' });
        }
    }
);

const startServer = async () => {
  await connectRedis ();
  await initDB();
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`Memoria Gateway is running on port ${PORT}`);
  });
};

startServer();