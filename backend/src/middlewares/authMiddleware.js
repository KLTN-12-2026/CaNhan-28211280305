import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectedRoute = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Không tìm thấy access token" });
    }

    jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET,
      async (err, decodedUser) => {
        if (err) {
          console.log(err);
          return res
            .status(403)
            .json({ message: "Access token hết hạn hoặc không đúng" });
        }

        const user = await User.findById(decodedUser.userId).select(
          "-hashedPassword"
        );
        if (!user) {
          return res.status(404).json({ message: "Người dùng không tồn tại" });
        }

        if (user.isBanned) {
          return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa" });
        }
        req.user = user;
        next();
      }
    );
  } catch (error) {
    console.error("Lỗi khi xác minh jwt trong authMiddleware", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
