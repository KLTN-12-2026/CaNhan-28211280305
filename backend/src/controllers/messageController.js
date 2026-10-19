import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import {
  emitNewMessage,
  updateConversationAfterCreateMessage,
} from "../utils/messageHelper.js";
import { io } from "../socket/index.js";
import { uploadImageFromBuffer } from "../middlewares/uploadMiddleware.js";
import User from "../models/User.js";

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file được upload" });
    }

    const result = await uploadImageFromBuffer(req.file.buffer, {
      folder: "gossip_chat/messages",
      transformation: [], // No transformation for chat images by default
    });

    return res.status(200).json({ imgUrl: result.secure_url });
  } catch (error) {
    console.error("Lỗi khi upload ảnh tin nhắn:", error);
    return res.status(500).json({ message: "Lỗi upload ảnh" });
  }
};

export const sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, content, conversationId, imgUrl } = req.body;
    const senderId = req.user._id;
    let conversation;
    if (!content && !imgUrl) {
      return res.status(400).json({ message: "Thiếu nội dung hoặc hình ảnh" });
    }
    const recipient = await User.findById(recipientId).select("blockedUsers");
    if (!recipient) {
      return res.status(404).json({ message: "Người nhận không tồn tại" });
    }
    const isBlocked =
      recipient.blockedUsers.some(
        (id) => id.toString() === senderId.toString()
      ) ||
      req.user.blockedUsers.some(
        (id) => id.toString() === recipientId.toString()
      );
    if (isBlocked) {
      return res.status(403).json({
        code: "USER_BLOCKED",
        message: "Bạn không thể gửi tin nhắn",
      });
    }
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    }
    if (!conversation) {
      conversation = await Conversation.create({
        type: "direct",
        participants: [
          { userId: senderId, joinedAt: new Date() },
          { userId: recipientId, joinedAt: new Date() },
        ],
        lastMessageAt: new Date(),
        unreadCounts: new Map(),
      });
    }
    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      content: content || "",
      imgUrl,
    });
    updateConversationAfterCreateMessage(conversation, message, senderId);
    await conversation.save();
    emitNewMessage(io, conversation, message);
    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi khi gửi tin nhắn trực tiếp:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { conversationId, content, imgUrl } = req.body;
    const senderId = req.user._id;
    const conversation = req.conversation;
    if (!content && !imgUrl) {
      return res.status(400).json({ message: "Thiếu nội dung hoặc hình ảnh" });
    }
    const message = await Message.create({
      conversationId,
      senderId,
      content: content || "",
      imgUrl,
    });
    updateConversationAfterCreateMessage(conversation, message, senderId);
    await conversation.save();
    emitNewMessage(io, conversation, message);
    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi khi gửi tin nhắn nhóm:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
