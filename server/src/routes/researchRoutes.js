import { Router } from "express";
import { researchQueryController } from "../controllers/researchController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/query", asyncHandler(researchQueryController));

export default router;
