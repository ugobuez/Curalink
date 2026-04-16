import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 6505,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/curalink",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "phi"
};
