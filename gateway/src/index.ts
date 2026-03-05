import express from "express";
import { connectRedis } from "./services/redis.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import dotenv from "dotenv";
import { initDB } from "./services/postgres.js";
import { connectMongo } from "./services/mongo.js";
import cors from "cors";
import generateRoute from "./routes/generate.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*", //will change
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(express.json());

app.use("/api/", rateLimiter);

app.use("/api/generate", generateRoute)

const startServer = async () => {
  await connectRedis();
  await initDB();
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`Memoria Gateway is running on port ${PORT}`);
  });
};

startServer();
