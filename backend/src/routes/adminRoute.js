import express from "express";
import {
  getAllUsers,
  toggleBanUser,
  updateUserRole,
  deleteUser,
  getReports,
  resolveReport,
  getAdminLogs,
  getDashboardStats,
} from "../controllers/adminController.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

const router = express.Router();

router.use(adminMiddleware);

router.get("/stats", getDashboardStats);
router.get("/users", getAllUsers);
router.patch("/users/:id/ban", toggleBanUser);
router.patch("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteUser);

router.get("/reports", getReports);
router.patch("/reports/:id/resolve", resolveReport);
router.get("/logs", getAdminLogs);

export default router;
