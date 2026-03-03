import express from "express";
import { connectRedis } from "./services/redis.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const startServer = async () => {
  await connectRedis ();
  app.listen(PORT, () => {
    console.log(`Memoria Gateway is running on port ${PORT}`);
  });
};

startServer();