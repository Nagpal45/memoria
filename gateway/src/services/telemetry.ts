import { TelemetryLog } from "./mongo.js";

interface LogPayload {
    prompt: string;
    response: string;
    source: string;
    latency_ms: number;
    similarity_score?: number;
}

export const logTelemetry = (data: LogPayload) => {
    TelemetryLog.create(data).catch(err => {
        console.error('Failed to write telemetry to MongoDB:', err);
    });
};