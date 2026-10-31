import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import SharedNote from "../models/SharedNote.js";
import { io } from "../socket/index.js";

const getGroupConversation = async (conversationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return { error: { status: 400, message: "ID nhóm không hợp lệ" } };
  }

  const conversation = await Conversation.findById(conversationId).select(
    "type participants.userId",
  );
  if (!conversation) {
    return { error: { status: 404, message: "Không tìm thấy nhóm chat" } };
  }
  if (conversation.type !== "group") {
    return { error: { status: 400, message: "Shared Notes chỉ dùng trong nhóm" } };
  }
  const isMember = conversation.participants.some(
    (participant) => participant.userId.toString() === userId.toString(),
  );
  if (!isMember) {
    return { error: { status: 403, message: "Bạn không phải thành viên nhóm" } };
  }

  return { conversation };
};

export const getSharedNote = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const result = await getGroupConversation(conversationId, req.user._id);
    if (result.error) {
      return res
        .status(result.error.status)
        .json({ message: result.error.message });
    }

    const note = await SharedNote.findOne({ conversationId });
    return res.status(200).json({
      note: note
        ? {
            content: note.content,
            version: note.version,
            updatedAt: note.updatedAt,
            updatedBy: note.updatedBy?.toString() ?? null,
          }
        : { content: "", version: 0, updatedAt: null, updatedBy: null },
    });
  } catch (error) {
    console.error("Lỗi khi tải Shared Notes:", error);
    return res.status(500).json({ message: "Không thể tải ghi chú chung" });
  }
};

export const updateSharedNote = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, version } = req.body ?? {};
    const result = await getGroupConversation(conversationId, req.user._id);
    if (result.error) {
      return res
        .status(result.error.status)
        .json({ message: result.error.message });
    }
    if (
      typeof content !== "string" ||
      content.length > 20000 ||
      !Number.isInteger(version) ||
      version < 0
    ) {
      return res.status(400).json({ message: "Nội dung ghi chú không hợp lệ" });
    }

    let note;
    const currentNote = await SharedNote.findOne({ conversationId });
    if (!currentNote && version === 0) {
      try {
        note = await SharedNote.create({
          conversationId,
          content,
          version: 1,
          updatedBy: req.user._id,
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }

    if (!note && currentNote?.version === version) {
      note = await SharedNote.findOneAndUpdate(
        { _id: currentNote._id, version },
        {
          $set: { content, updatedBy: req.user._id },
          $inc: { version: 1 },
        },
        { new: true, runValidators: true },
      );
    }

    if (!note) {
      const latestNote = await SharedNote.findOne({ conversationId });
      return res.status(409).json({
        message: "Ghi chú đã được thành viên khác cập nhật",
        note: latestNote
          ? {
              content: latestNote.content,
              version: latestNote.version,
              updatedAt: latestNote.updatedAt,
              updatedBy: latestNote.updatedBy?.toString() ?? null,
            }
          : { content: "", version: 0, updatedAt: null, updatedBy: null },
      });
    }

    const updatedNote = {
      conversationId,
      content: note.content,
      version: note.version,
      updatedAt: note.updatedAt,
      updatedBy: note.updatedBy.toString(),
    };
    result.conversation.participants.forEach((participant) => {
      io.to(participant.userId.toString()).emit(
        "shared-notes:updated",
        updatedNote,
      );
    });
    return res.status(200).json({ note: updatedNote });
  } catch (error) {
    console.error("Lỗi khi lưu Shared Notes:", error);
    return res.status(500).json({ message: "Không thể lưu ghi chú chung" });
  }
};
