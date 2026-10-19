import { uploadImageFromBuffer } from "../middlewares/uploadMiddleware.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

const updateBlockedUser = async (req, res, shouldBlock) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Người dùng không hợp lệ" });
    }
    if (userId === currentUserId.toString()) {
      return res.status(400).json({ message: "Bạn không thể chặn chính mình" });
    }

    const targetUser = await User.findById(userId).select("blockedUsers");
    if (!targetUser) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const update = shouldBlock
      ? { $addToSet: { blockedUsers: targetUser._id } }
      : { $pull: { blockedUsers: targetUser._id } };
    const updatedUser = await User.findByIdAndUpdate(currentUserId, update, {
      new: true,
    }).select("blockedUsers");

    const isBlocked =
      updatedUser.blockedUsers.some((id) => id.toString() === userId) ||
      targetUser.blockedUsers.some(
        (id) => id.toString() === currentUserId.toString()
      );

    return res.status(200).json({
      blockedUsers: updatedUser.blockedUsers.map((id) => id.toString()),
      isBlocked,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật danh sách chặn:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const blockUser = (req, res) => updateBlockedUser(req, res, true);

export const unblockUser = (req, res) => updateBlockedUser(req, res, false);

export const authMe = async (req, res) => {
  try {
    const user = req.user;
    return res.status(200).json({ user });
  } catch (error) {
    console.error("Lỗi khi gọi authMe", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const searchUserByUsername = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username || username.trim() === "") {
      return res.status(400).json({ message: "Cần cung cấp username" });
    }

    const user = await User.findOne({ username }).select(
      "_id displayName avatarUrl username"
    );
    return res.status(200).json({ user });
  } catch (error) {
    console.error("Lỗi xảy ra khi searchUserByUsername", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user._id;
    if (!file) {
      return res.status(400).json({ message: "Không có file được upload" });
    }
    const result = await uploadImageFromBuffer(file.buffer);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatarUrl: result.secure_url, avatarId: result.public_id },
      {
        new: true,
      }
    ).select("avatarUrl");
    if (!updatedUser.avatarUrl) {
      return res.status(400).json({ message: "Avatar trả về null" });
    }
    return res.status(200).json({ avatarUrl: updatedUser.avatarUrl });
  } catch (error) {
    console.error("Lỗi xảy ra khi upload avatar: ", error);
    return res.status(500).json({ message: "Avatar upload thất bại" });
  }
};

export const updateUserInfo = async (req, res) => {
  try {
    const userId = req.user._id;
    const { displayName, username, email, phone, bio } = req.body;

    // Kiểm tra username có bị trùng không
    if (username) {
      const existingUser = await User.findOne({
        username,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(409).json({ message: "Username đã tồn tại" });
      }
    }

    // Kiểm tra email có bị trùng không
    if (email) {
      const existingEmail = await User.findOne({
        email,
        _id: { $ne: userId },
      });
      if (existingEmail) {
        return res.status(409).json({ message: "Email đã tồn tại" });
      }
    }

    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("displayName username email phone bio avatarUrl");

    return res.status(200).json({
      message: "Cập nhật thông tin thành công",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật thông tin user:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "Vui lòng cung cấp đầy đủ thông tin" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Mật khẩu xác nhận không khớp" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    const user = await User.findById(userId);
    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user.hashedPassword
    );

    if (!passwordMatch) {
      return res.status(401).json({ message: "Mật khẩu hiện tại không đúng" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(userId, { hashedPassword });

    return res.status(200).json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error("Lỗi khi đổi mật khẩu:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { isDarkMode, showOnlineStatus } = req.body;

    const updateData = {};
    if (isDarkMode !== undefined) updateData.isDarkMode = isDarkMode;
    if (showOnlineStatus !== undefined)
      updateData.showOnlineStatus = showOnlineStatus;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("isDarkMode showOnlineStatus");

    return res.status(200).json({
      message: "Cập nhật tuỳ chỉnh thành công",
      preferences: updatedUser,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật tuỳ chỉnh:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
