import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import researchRoutes from "./routes/researchRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
app.use("/api/research", researchRoutes);
app.use("/api/chat", chatRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
