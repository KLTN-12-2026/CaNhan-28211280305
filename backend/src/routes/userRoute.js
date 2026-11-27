import express from "express";
import {
  authMe,
  getBlockedUsers,
  searchUserByUsername,
  uploadAvatar,
  updateUserInfo,
  changePassword,
  updatePreferences,
  blockUser,
  unblockUser,
  deleteAccount,
} from "../controllers/userController.js";
import { upload } from "../middlewares/uploadMiddleware.js";
import {
  getLoginSessions,
  revokeLoginSession,
  revokeOtherLoginSessions,
  requestTwoFactorChange,
  verifyTwoFactorChange,
} from "../controllers/authController.js";

const router = express.Router();

router.get("/me", authMe);
router.get("/blocked", getBlockedUsers);
router.get("/sessions", getLoginSessions);
router.delete("/sessions/:sessionId", revokeLoginSession);
router.delete("/sessions", revokeOtherLoginSessions);
router.post("/two-factor/request", requestTwoFactorChange);
router.post("/two-factor/verify", verifyTwoFactorChange);
router.get("/search", searchUserByUsername);
router.post("/uploadAvatar", upload.single("file"), uploadAvatar);
router.patch("/profile", updateUserInfo);
router.post("/change-password", changePassword);
router.patch("/preferences", updatePreferences);
router.delete("/account", deleteAccount);
router.post("/:userId/block", blockUser);
router.delete("/:userId/block", unblockUser);

export default router;
