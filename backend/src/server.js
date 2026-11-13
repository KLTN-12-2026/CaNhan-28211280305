import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./libs/db.js";
import authRoute from "./routes/authRoute.js";
import cookieParser from "cookie-parser";
import userRoute from "./routes/userRoute.js";
import friendRoute from "./routes/friendRoute.js";
import messageRoute from "./routes/messageRoute.js";
import conversationRoute from "./routes/conversationRoute.js";
import adminRoute from "./routes/adminRoute.js";
import aiRoute from "./routes/aiRoute.js";
import { protectedRoute } from "./middlewares/authMiddleware.js";
import cors from "cors";
import { app, server } from "./socket/index.js";
import { v2 as cloudinary } from "cloudinary";
import User from "./models/User.js";

import reportRoute from "./routes/reportRoute.js";

dotenv.config();

const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use("/api/auth", authRoute);

app.use(protectedRoute);
app.use("/api/users", userRoute);
app.use("/api/friends", friendRoute);
app.use("/api/messages", messageRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/admin", adminRoute);
app.use("/api/ai", aiRoute);
app.use("/api/reports", reportRoute);

const bootstrapSuperAdmin = async () => {
  const username = process.env.SUPER_ADMIN_USERNAME?.trim().toLowerCase();
  if (!username) {
    console.warn(
      "SUPER_ADMIN_USERNAME is not configured; no Super Admin was bootstrapped.",
    );
    return;
  }

  const user = await User.findOne({ username });
  if (!user) {
    console.warn(
      "Configured SUPER_ADMIN_USERNAME does not match an existing account; no Super Admin was bootstrapped.",
    );
    return;
  }

  if (user.role !== "superadmin") {
    user.role = "superadmin";
    await user.save();
    console.log("Configured Super Admin account bootstrapped.");
  }
};

connectDB()
  .then(async () => {
    await bootstrapSuperAdmin();
    server.listen(PORT, () => {
      console.log(`Server start on PORT: ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize the server:", error);
    process.exitCode = 1;
  });
