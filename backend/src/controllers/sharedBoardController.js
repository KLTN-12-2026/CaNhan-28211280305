import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import SharedBoard from "../models/SharedBoard.js";
import { io } from "../socket/index.js";

const maxElements = 50;
const maxPointsPerStroke = 50;
const maxNoteLength = 300;

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
    return { error: { status: 400, message: "Whiteboard chỉ dùng trong nhóm" } };
  }
  if (
    !conversation.participants.some(
      (participant) => participant.userId.toString() === userId.toString(),
    )
  ) {
    return { error: { status: 403, message: "Bạn không phải thành viên nhóm" } };
  }
  return { conversation };
};

const isValidCoordinate = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;

const validateElements = (elements) => {
  if (!Array.isArray(elements) || elements.length > maxElements) return false;

  return elements.every((element) => {
    if (
      !element ||
      typeof element !== "object" ||
      typeof element.id !== "string" ||
      element.id.length === 0 ||
      element.id.length > 64
    ) {
      return false;
    }

    if (element.type === "stroke") {
      return (
        typeof element.color === "string" &&
        /^#[0-9a-fA-F]{6}$/.test(element.color) &&
        typeof element.width === "number" &&
        Number.isFinite(element.width) &&
        element.width >= 1 &&
        element.width <= 12 &&
        Array.isArray(element.points) &&
        element.points.length >= 2 &&
        element.points.length <= maxPointsPerStroke &&
        element.points.every(
          (point) =>
            point &&
            isValidCoordinate(point.x) &&
            isValidCoordinate(point.y),
        )
      );
    }

    return (
      element.type === "note" &&
      typeof element.text === "string" &&
      element.text.trim().length > 0 &&
      element.text.length <= maxNoteLength &&
      isValidCoordinate(element.x) &&
      isValidCoordinate(element.y)
    );
  });
};

const sanitizeElements = (elements) =>
  elements.map((element) =>
    element.type === "stroke"
      ? {
          id: element.id,
          type: "stroke",
          color: element.color,
          width: element.width,
          points: element.points.map(({ x, y }) => ({ x, y })),
        }
      : {
          id: element.id,
          type: "note",
          text: element.text.trim(),
          x: element.x,
          y: element.y,
        },
  );

const formatBoard = (conversationId, board) => ({
  conversationId,
  elements: board?.elements ?? [],
  version: board?.version ?? 0,
  updatedAt: board?.updatedAt ?? null,
  updatedBy: board?.updatedBy?.toString() ?? null,
});

export const getSharedBoard = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const result = await getGroupConversation(conversationId, req.user._id);
    if (result.error) {
      return res
        .status(result.error.status)
        .json({ message: result.error.message });
    }

    const board = await SharedBoard.findOne({ conversationId });
    return res.status(200).json({ board: formatBoard(conversationId, board) });
  } catch (error) {
    console.error("Lỗi khi tải Whiteboard:", error);
    return res.status(500).json({ message: "Không thể tải Whiteboard" });
  }
};

export const updateSharedBoard = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { elements, version } = req.body ?? {};
    const result = await getGroupConversation(conversationId, req.user._id);
    if (result.error) {
      return res
        .status(result.error.status)
        .json({ message: result.error.message });
    }
    if (!Number.isInteger(version) || version < 0 || !validateElements(elements)) {
      return res.status(400).json({
        message:
          "Dữ liệu Whiteboard không hợp lệ hoặc vượt quá giới hạn cho phép",
      });
    }

    const safeElements = sanitizeElements(elements);
    let board;
    const currentBoard = await SharedBoard.findOne({ conversationId });
    if (!currentBoard && version === 0) {
      try {
        board = await SharedBoard.create({
          conversationId,
          elements: safeElements,
          version: 1,
          updatedBy: req.user._id,
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }

    if (!board && currentBoard?.version === version) {
      board = await SharedBoard.findOneAndUpdate(
        { _id: currentBoard._id, version },
        {
          $set: { elements: safeElements, updatedBy: req.user._id },
          $inc: { version: 1 },
        },
        { new: true, runValidators: true },
      );
    }

    if (!board) {
      const latestBoard = await SharedBoard.findOne({ conversationId });
      return res.status(409).json({
        message: "Whiteboard đã được thành viên khác cập nhật",
        board: formatBoard(conversationId, latestBoard),
      });
    }

    const updatedBoard = formatBoard(conversationId, board);
    result.conversation.participants.forEach((participant) => {
      io.to(participant.userId.toString()).emit(
        "whiteboard:updated",
        updatedBoard,
      );
    });
    return res.status(200).json({ board: updatedBoard });
  } catch (error) {
    console.error("Lỗi khi lưu Whiteboard:", error);
    return res.status(500).json({ message: "Không thể lưu Whiteboard" });
  }
};
