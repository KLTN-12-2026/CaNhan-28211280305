import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";
import Session from "../models/Session.js";
import OTP from "../models/OTP.js";
import {
  generateOTP,
  sendOTPEmail,
  sendTwoFactorOTPEmail,
} from "../libs/emailService.js";

const ACCESS_TOKEN_TTL = "60d";
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;

const createLoginSession = async (req, user) => {
  const accessToken = jwt.sign(
    { userId: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  );

  const refreshToken = crypto.randomBytes(64).toString("hex");
  const forwardedFor = req.headers["x-forwarded-for"];
  const ipAddress =
    (typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0].trim()
      : req.ip) || null;

  await Session.create({
    userId: user._id,
    refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    ipAddress,
    userAgent: req.get("user-agent") || null,
    lastSeenAt: new Date(),
  });

  return { accessToken, refreshToken };
};

export const signUp = async (req, res) => {
  try {
    const { username, password, email, firstName, lastName, acceptedTerms } =
      req.body;
    if (acceptedTerms !== true) {
      return res.status(400).json({
        message: "Bạn cần đồng ý với điều khoản dịch vụ và chính sách bảo mật",
      });
    }
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
    await OTP.deleteOne({ email, purpose: "signup" });

    // Lưu OTP
    await OTP.create({
      email,
      otp,
      expiresAt,
      purpose: "signup",
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
        message: "Tài khoản của bạn đã bị khóa. Vui lòng kiểm tra lại.",
      });
    }

    const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordCorrect) {
      return res
        .status(401)
        .json({ message: "username hoặc password không đúng" });
    }

    if (user.twoFactorEnabled) {
      await OTP.deleteOne({ email: user.email, purpose: "two_factor_login" });
      const otp = generateOTP();
      await OTP.create({
        email: user.email,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        purpose: "two_factor_login",
      });
      await sendTwoFactorOTPEmail(user.email, otp, "login");

      const challengeToken = jwt.sign(
        { userId: user._id, purpose: "two_factor_login" },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "10m" },
      );
      return res.status(200).json({
        requiresTwoFactor: true,
        challengeToken,
        email: user.email,
      });
    }

    const { accessToken, refreshToken } = await createLoginSession(req, user);

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

export const requestTwoFactorChange = async (req, res) => {
  try {
    const { action } = req.body;
    if (!["enable", "disable"].includes(action)) {
      return res.status(400).json({ message: "Thao tác xác thực không hợp lệ" });
    }
    if (action === "enable" && req.user.twoFactorEnabled) {
      return res.status(400).json({ message: "Xác thực hai bước đã được bật" });
    }
    if (action === "disable" && !req.user.twoFactorEnabled) {
      return res.status(400).json({ message: "Xác thực hai bước chưa được bật" });
    }

    const purpose =
      action === "enable" ? "two_factor_enable" : "two_factor_disable";
    await OTP.deleteOne({ email: req.user.email, purpose });
    const otp = generateOTP();
    await OTP.create({
      email: req.user.email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      purpose,
    });
    await sendTwoFactorOTPEmail(
      req.user.email,
      otp,
      action,
    );
    return res.status(200).json({
      message: "Mã xác thực đã được gửi đến email của bạn",
    });
  } catch (error) {
    console.error("Lỗi khi gửi OTP xác thực hai bước:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const verifyTwoFactorChange = async (req, res) => {
  try {
    const { action, otp, password } = req.body;
    if (!["enable", "disable"].includes(action) || !otp) {
      return res.status(400).json({ message: "Thiếu thông tin xác thực" });
    }
    if (action === "disable") {
      if (!password) {
        return res.status(400).json({ message: "Vui lòng nhập mật khẩu hiện tại" });
      }
      const fullUser = await User.findById(req.user._id).select("hashedPassword");
      if (!fullUser) {
        return res.status(404).json({ message: "Người dùng không tồn tại" });
      }
      const passwordCorrect = await bcrypt.compare(
        password,
        fullUser.hashedPassword,
      );
      if (!passwordCorrect) {
        return res.status(401).json({ message: "Mật khẩu hiện tại không đúng" });
      }
    }

    const purpose =
      action === "enable" ? "two_factor_enable" : "two_factor_disable";
    const otpRecord = await OTP.findOne({
      email: req.user.email,
      otp,
      purpose,
    });
    if (!otpRecord) {
      return res.status(401).json({ message: "Mã OTP không hợp lệ" });
    }
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(401).json({ message: "Mã OTP đã hết hạn" });
    }

    await OTP.deleteOne({ _id: otpRecord._id });
    req.user.twoFactorEnabled = action === "enable";
    await req.user.save();
    return res.status(200).json({
      message:
        action === "enable"
          ? "Đã bật xác thực hai bước"
          : "Đã tắt xác thực hai bước",
      twoFactorEnabled: req.user.twoFactorEnabled,
    });
  } catch (error) {
    console.error("Lỗi xác nhận xác thực hai bước:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const verifyLoginTwoFactor = async (req, res) => {
  try {
    const { challengeToken, otp } = req.body;
    if (!challengeToken || !otp) {
      return res.status(400).json({
        message: "Thiếu mã xác thực hoặc phiên xác minh",
      });
    }

    let challenge;
    try {
      challenge = jwt.verify(
        challengeToken,
        process.env.ACCESS_TOKEN_SECRET,
      );
    } catch {
      return res.status(401).json({
        message: "Phiên xác thực hai bước đã hết hạn",
      });
    }
    if (challenge.purpose !== "two_factor_login") {
      return res.status(400).json({ message: "Phiên xác thực không hợp lệ" });
    }

    const user = await User.findById(challenge.userId);
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({
        message: "Xác thực hai bước không khả dụng cho tài khoản này",
      });
    }

    const otpRecord = await OTP.findOne({
      email: user.email,
      otp,
      purpose: "two_factor_login",
    });
    if (!otpRecord) {
      return res.status(401).json({ message: "Mã OTP không hợp lệ" });
    }
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(401).json({ message: "Mã OTP đã hết hạn" });
    }

    await OTP.deleteOne({ _id: otpRecord._id });
    const { accessToken, refreshToken } = await createLoginSession(req, user);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: REFRESH_TOKEN_TTL,
    });
    return res.status(200).json({
      message: `User ${user.displayName} đã logged in`,
      accessToken,
    });
  } catch (error) {
    console.error("Lỗi xác thực hai bước:", error);
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

export const getLoginSessions = async (req, res) => {
  try {
    const currentRefreshToken = req.cookies?.refreshToken;
    const sessions = await Session.find({
      userId: req.user._id,
      expiresAt: { $gt: new Date() },
    }).sort({ lastSeenAt: -1, createdAt: -1 });

    return res.status(200).json({
      sessions: sessions.map((session) => ({
        _id: session._id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        lastSeenAt: session.lastSeenAt,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        isCurrent: session.refreshToken === currentRefreshToken,
      })),
    });
  } catch (error) {
    console.error("Lỗi khi lấy phiên đăng nhập:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const revokeLoginSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Phiên đăng nhập không hợp lệ" });
    }
    const currentRefreshToken = req.cookies?.refreshToken;
    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id,
    });
    if (!session) {
      return res.status(404).json({ message: "Phiên đăng nhập không tồn tại" });
    }
    if (session.refreshToken === currentRefreshToken) {
      return res.status(400).json({
        message: "Không thể đăng xuất phiên hiện tại tại đây",
      });
    }

    await Session.deleteOne({ _id: session._id });
    return res.status(200).json({ message: "Đã đăng xuất thiết bị" });
  } catch (error) {
    console.error("Lỗi khi đăng xuất phiên:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const revokeOtherLoginSessions = async (req, res) => {
  try {
    const currentRefreshToken = req.cookies?.refreshToken;
    await Session.deleteMany({
      userId: req.user._id,
      refreshToken: { $ne: currentRefreshToken },
    });
    return res.status(200).json({
      message: "Đã đăng xuất các thiết bị khác",
    });
  } catch (error) {
    console.error("Lỗi khi đăng xuất các phiên khác:", error);
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
      await Session.deleteOne({ _id: session._id });
      return res.status(403).json({ message: "Token đã hết hạn" });
    }
    session.lastSeenAt = new Date();
    await session.save();

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

    await OTP.deleteOne({ email, purpose: "signup" });

    const newOTP = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.create({
      email,
      otp: newOTP,
      expiresAt,
      purpose: "signup",
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
    const {
      email,
      otp,
      username,
      password,
      firstName,
      lastName,
      acceptedTerms,
    } = req.body;
    if (acceptedTerms !== true) {
      return res.status(400).json({
        message: "Bạn cần đồng ý với điều khoản dịch vụ và chính sách bảo mật",
      });
    }
    if (!email || !otp) {
      return res.status(400).json({ message: "Email và OTP là bắt buộc" });
    }

    const otpRecord = await OTP.findOne({
      email,
      otp,
      purpose: "signup",
    });
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
