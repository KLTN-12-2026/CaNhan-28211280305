import express from "express";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { generateSmartReplies } from "../controllers/aiController.js";

const router = express.Router();

router.post("/smart-reply", protectedRoute, generateSmartReplies);

export default router;
