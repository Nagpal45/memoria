import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectMongo = async () => {
  try {
    const mongoUri = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@127.0.0.1:27017/memoria_logs?authSource=admin`;

    mongoose.set('bufferCommands', false);

    await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 3000
    });
    console.log("Connected to MongoDB (Telemetry Data Lake)");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};

const telemetrySchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  response: { type: String, required: true },
  source: {
    type: String,
    enum: ["redis_cache", "postgres_semantic_cache", "llm_generated"],
    required: true,
  },
  latency_ms: { type: Number, required: true },
  similarity_score: { type: Number, required: false }, 
  timestamp: { type: Date, default: Date.now },
});

export const TelemetryLog = mongoose.model("TelemetryLog", telemetrySchema);