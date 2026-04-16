import { Router } from "express";
import { chatHistoryController } from "../controllers/chatController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/history", asyncHandler(chatHistoryController));

export default router;
