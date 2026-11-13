import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import {
  emitNewMessage,
  updateConversationAfterCreateMessage,
} from "../utils/messageHelper.js";
import { io } from "../socket/index.js";
import { uploadImageFromBuffer } from "../middlewares/uploadMiddleware.js";
import User from "../models/User.js";

const getReplyToMessage = async (replyToId, conversationId) => {
  if (!replyToId) return { message: null };
  if (
    typeof replyToId !== "string" ||
    !mongoose.Types.ObjectId.isValid(replyToId)
  ) {
    return { error: { status: 400, message: "Tin nhắn trả lời không hợp lệ" } };
  }

  const message = await Message.findOne({
    _id: replyToId,
    conversationId,
  });
  if (!message) {
    return {
      error: { status: 404, message: "Không tìm thấy tin nhắn được trả lời" },
    };
  }
  return { message };
};

const populateReplyTo = async (message) => {
  await message.populate({
    path: "replyTo",
    select: "content imgUrl senderId callDetails",
    populate: { path: "senderId", select: "displayName" },
  });
  return message;
};

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file được upload" });
    }

    const result = await uploadImageFromBuffer(req.file.buffer, {
      folder: "gossip_chat/messages",
      transformation: [],
    });

    return res.status(200).json({ imgUrl: result.secure_url });
  } catch (error) {
    console.error("Lỗi khi upload ảnh tin nhắn:", error);
    return res.status(500).json({ message: "Lỗi upload ảnh" });
  }
};

export const sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, content, conversationId, imgUrl, replyToId } = req.body;
    const senderId = req.user._id;
    let conversation;
    if (!content && !imgUrl) {
      return res.status(400).json({ message: "Thiếu nội dung hoặc hình ảnh" });
    }
    if (
      replyToId &&
      (typeof conversationId !== "string" ||
        !mongoose.Types.ObjectId.isValid(conversationId))
    ) {
      return res.status(400).json({
        message: "Cuộc trò chuyện của tin nhắn được trả lời không hợp lệ",
      });
    }
    const recipient = await User.findById(recipientId).select("blockedUsers");
    if (!recipient) {
      return res.status(404).json({ message: "Người nhận không tồn tại" });
    }
    const isBlocked =
      recipient.blockedUsers.some(
        (id) => id.toString() === senderId.toString(),
      ) ||
      req.user.blockedUsers.some(
        (id) => id.toString() === recipientId.toString(),
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
    if (replyToId && !conversation) {
      return res.status(404).json({
        message: "Không tìm thấy cuộc trò chuyện của tin nhắn được trả lời",
      });
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
    if (replyToId) {
      const participantIds = conversation.participants.map((participant) =>
        participant.userId.toString(),
      );
      if (
        conversation.type !== "direct" ||
        !participantIds.includes(senderId.toString()) ||
        !participantIds.includes(recipientId.toString())
      ) {
        return res.status(403).json({
          message: "Bạn không thể trả lời tin nhắn trong cuộc trò chuyện này",
        });
      }
    }
    const replyResult = await getReplyToMessage(replyToId, conversation._id);
    if (replyResult.error) {
      return res
        .status(replyResult.error.status)
        .json({ message: replyResult.error.message });
    }
    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      content: content || "",
      imgUrl,
      replyTo: replyResult.message?._id ?? null,
    });
    await populateReplyTo(message);
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
    const { conversationId, content, imgUrl, replyToId } = req.body;
    const senderId = req.user._id;
    const conversation = req.conversation;
    if (!content && !imgUrl) {
      return res.status(400).json({ message: "Thiếu nội dung hoặc hình ảnh" });
    }
    const replyResult = await getReplyToMessage(replyToId, conversationId);
    if (replyResult.error) {
      return res
        .status(replyResult.error.status)
        .json({ message: replyResult.error.message });
    }
    const message = await Message.create({
      conversationId,
      senderId,
      content: content || "",
      imgUrl,
      replyTo: replyResult.message?._id ?? null,
    });
    await populateReplyTo(message);
    updateConversationAfterCreateMessage(conversation, message, senderId);
    await conversation.save();
    emitNewMessage(io, conversation, message);
    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi khi gửi tin nhắn nhóm:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
