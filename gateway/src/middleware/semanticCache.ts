import type { NextFunction, Request, Response } from "express";
import { getEmbedding } from "../services/vector.js";
import pool from "../services/postgres.js";
import redisClient from "../services/redis.js";
import { logTelemetry } from "../services/telemetry.js";

export const checkSemanticCache = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { prompt } = req.body;

  try {
    // console.log("L1 Miss. Checking L2 Semantic Cache...");
    const startTime = Date.now();
    const embedding = await getEmbedding(prompt);

    const embeddingString = `[${embedding.join(",")}]`;

    const query = `
            SELECT response, 1 - (embedding <=> $1::vector) AS similarity 
            FROM semantic_cache 
            ORDER BY similarity DESC 
            LIMIT 1;
        `;

    const result = await pool.query(query, [embeddingString]);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    if (result.rows.length > 0) {
      const match = result.rows[0];

      // console.log(
      //   `Top Semantic Match Score: ${(match.similarity * 100).toFixed(2)}%`,
      // );

      if (match.similarity > 0.95) {
        const latency = Date.now() - startTime;
        // console.log(`Cache Hit! Served from PostgreSQL`);

        if (req.body.cacheKey) {
          await redisClient.setEx(
            req.body.cacheKey,
            3600,
            JSON.stringify(match.response),
          );
          // console.log(`Promoted L2 Semantic Hit to L1 Redis Cache`);
        }

        const metadataPacket = {
          event: "metadata",
          source: "postgres_semantic_cache",
          similarity: match.similarity,
          vector: embedding.slice(0, 15),
        };

        res.write(`data: ${JSON.stringify(metadataPacket)}\n\n`);
        res.write(`data: ${JSON.stringify({ text: match.response })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();

        await logTelemetry({
          prompt: prompt,
          response: match.response,
          source: "postgres_semantic_cache",
          latency_ms: latency,
          similarity_score: match.similarity,
        });
        return;
      } else {
        const metadataPacket = {
          event: "metadata",
          source: "postgres_semantic_cache_miss",
          similarity: match.similarity,
          vector: embedding.slice(0, 15),
        };
        res.write(`data: ${JSON.stringify(metadataPacket)}\n\n`);
      }
    } else {
      // Complete miss (no rows in DB)
      const metadataPacket = {
        event: "metadata",
        source: "postgres_semantic_cache_miss",
        similarity: 0,
        vector: embedding.slice(0, 15),
      };
      res.write(`data: ${JSON.stringify(metadataPacket)}\n\n`);
    }

    req.body.embedding = embeddingString;
    next();
  } catch (error) {
    console.error("Semantic Cache Error:", error);
    next();
  }
};
