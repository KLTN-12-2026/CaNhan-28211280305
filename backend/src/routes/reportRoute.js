import express from "express";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { createReport } from "../controllers/reportController.js";

const router = express.Router();

router.post("/", protectedRoute, createReport);

export default router;
