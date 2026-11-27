import express from "express";
import {
  refreshToken,
  signIn,
  signOut,
  signUp,
  sendOTP,
  verifyOTP,
  verifyLoginTwoFactor,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signUp);
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/signin", signIn);
router.post("/signin/2fa", verifyLoginTwoFactor);
router.post("/signout", signOut);
router.post("/refresh", refreshToken);

export default router;
