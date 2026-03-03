import express from "express";
import { connectRedis } from "./services/redis.js";
import { rateLimiter } from "./middleware/rateLimiter.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/', rateLimiter);

// placeholder route
app.post('/api/generate', (req, res) => {
    res.json({ 
        message: 'Request passed the Redis rate limiter. Ready for LLM proxying!',
        promptReceived: req.body.prompt 
    });
});

const startServer = async () => {
  await connectRedis ();
  app.listen(PORT, () => {
    console.log(`Memoria Gateway is running on port ${PORT}`);
  });
};

startServer();