import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Session from "../models/Session.js";
import OTP from "../models/OTP.js";
import { generateOTP, sendOTPEmail } from "../libs/emailService.js";

const ACCESS_TOKEN_TTL = "60d";
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;

export const signUp = async (req, res) => {
  try {
    const { username, password, email, firstName, lastName } = req.body;
    if (!username || !password || !email || !firstName || !lastName) {
      return res.status(400).json({
        message:
          "Không thể thiếu username, password, email, firstName và lastName",
      });
    }

    const duplicate = await User.findOne({ username });
    if (duplicate) {
      return res.status(409).json({ message: "Username đã tồn tại" });
    }

    const emailExists = await User.findOne({
      email,
      isEmailVerified: true,
    });
    if (emailExists) {
      return res.status(409).json({ message: "Email này đã được đăng ký" });
    }

    // Gửi OTP cho email
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    // Xóa OTP cũ nếu có
    await OTP.deleteOne({ email });

    // Lưu OTP
    await OTP.create({
      email,
      otp,
      expiresAt,
    });

    // Gửi email
    await sendOTPEmail(email, otp);

    return res.status(200).json({
      message:
        "Mã OTP đã được gửi đến email của bạn. Vui lòng xác minh để hoàn tất đăng ký.",
      email,
    });
  } catch (error) {
    console.error("Lỗi khi gọi signUp", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const signIn = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Thiếu username hoặc password" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(401)
        .json({ message: "username hoặc password không đúng" });
    }

    if (user.isBanned) {
      return res.status(403).json({
        message:
          "Tài khoản của bạn đã bị khóa. Vui lòng kiểm tra email để biết thêm chi tiết.",
      });
    }

    const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordCorrect) {
      return res
        .status(401)
        .json({ message: "username hoặc password không đúng" });
    }

    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    const refreshToken = crypto.randomBytes(64).toString("hex");
    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: REFRESH_TOKEN_TTL,
    });

    res
      .status(200)
      .json({ message: `User ${user.displayName} đã logged in`, accessToken });
  } catch (error) {
    console.error("Lỗi khi gọi signIn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const signOut = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await Session.deleteOne({ refreshToken: token });

      res.clearCookie("refreshToken");
    }
    return res.sendStatus(204);
  } catch (error) {
    console.error("Lỗi khi gọi signOut", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "Token không tồn tại" });
    }

    const session = await Session.findOne({ refreshToken: token });
    if (!session) {
      return res
        .status(403)
        .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }

    if (session.expiresAt < new Date()) {
      return res.status(403).json({ message: "Token đã hết hạn" });
    }

    const accessToken = jwt.sign(
      {
        userId: session.userId,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_TTL },
    );

    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Lỗi khi gọi refreshToken", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email là bắt buộc" });
    }

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(409).json({ message: "Email này đã được đăng ký" });
    }

    await OTP.deleteOne({ email });

    const newOTP = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.create({
      email,
      otp: newOTP,
      expiresAt,
    });

    // Gửi email
    await sendOTPEmail(email, newOTP);

    return res
      .status(200)
      .json({ message: "Mã OTP đã được gửi đến email của bạn" });
  } catch (error) {
    console.error("Lỗi khi gửi OTP:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp, username, password, firstName, lastName } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email và OTP là bắt buộc" });
    }

    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(401).json({ message: "OTP không hợp lệ" });
    }

    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(401).json({ message: "OTP đã hết hạn" });
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res
        .status(429)
        .json({ message: "Bạn đã nhập OTP quá nhiều lần. Vui lòng thử lại." });
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    // Kiểm tra username đã tồn tại
    const duplicate = await User.findOne({ username });
    if (duplicate) {
      return res.status(409).json({ message: "Username đã tồn tại" });
    }

    // Tạo user mới với email verified
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      hashedPassword,
      email,
      displayName: `${lastName} ${firstName}`,
      isEmailVerified: true,
    });

    return res.status(201).json({
      message: "Đăng ký thành công",
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        displayName: newUser.displayName,
      },
    });
  } catch (error) {
    console.error("Lỗi khi xác minh OTP:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
