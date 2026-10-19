import express from "express";
import {
  authMe,
  searchUserByUsername,
  uploadAvatar,
  updateUserInfo,
  changePassword,
  updatePreferences,
  blockUser,
  unblockUser,
} from "../controllers/userController.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/me", authMe);
router.get("/search", searchUserByUsername);
router.post("/uploadAvatar", upload.single("file"), uploadAvatar);
router.patch("/profile", updateUserInfo);
router.post("/change-password", changePassword);
router.patch("/preferences", updatePreferences);
router.post("/:userId/block", blockUser);
router.delete("/:userId/block", unblockUser);

export default router;
