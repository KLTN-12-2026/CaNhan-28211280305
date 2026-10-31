import { Server } from "socket.io";
import http from "http";
import express from "express";
import { socketAuthMiddleware } from "../middlewares/socketMiddleware.js";
import { getUserConversationsForSocketIO } from "../controllers/conversationController.js";
import Conversation from "../models/Conversation.js";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import {
  emitNewMessage,
  updateConversationAfterCreateMessage,
} from "../utils/messageHelper.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

io.use(socketAuthMiddleware);

const onlineUser = new Map();

const getOnlineUserIds = () => Array.from(onlineUser.keys());
const broadcastOnlineUsers = () => {
  io.emit("online-users", getOnlineUserIds());
};

const callEvents = {
  "call:invite": "call:incoming",
  "call:accept": "call:accepted",
  "call:reject": "call:rejected",
  "call:offer": "call:offer",
  "call:answer": "call:answer",
  "call:ice-candidate": "call:ice-candidate",
  "call:connected": "call:connected",
  "call:end": "call:ended",
};
const activeCalls = new Map();

const finishCall = async (call, status) => {
  if (activeCalls.get(call.callId) !== call) return;
  activeCalls.delete(call.callId);
  clearTimeout(call.timeout);

  try {
    const conversation = await Conversation.findById(call.conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${call.conversationId} was not found`);
    }

    const endedAt = new Date();
    const durationSeconds =
      status === "completed" && call.connectedAt
        ? Math.max(0, Math.floor((endedAt - call.connectedAt) / 1000))
        : 0;
    const message = await Message.create({
      conversationId: call.conversationId,
      senderId: call.callerId,
      content: call.kind === "video" ? "Cuộc gọi video" : "Cuộc gọi thoại",
      callDetails: {
        kind: call.kind,
        status,
        callerId: call.callerId,
        calleeId: call.calleeId,
        durationSeconds,
        endedAt,
      },
    });
    updateConversationAfterCreateMessage(
      conversation,
      message,
      call.callerId,
    );
    await conversation.save();
    emitNewMessage(io, conversation, message);
  } catch (error) {
    console.error("Lỗi khi lưu lịch sử cuộc gọi:", error);
  }
};

io.on("connection", async (socket) => {
  const user = socket.user;
  const userId = user._id.toString();
  console.log(`${user.displayName} online với socket ${socket.id}`);
  let userSockets = onlineUser.get(userId);
  if (!userSockets) {
    userSockets = new Set();
    onlineUser.set(userId, userSockets);
  }
  userSockets.add(socket.id);
  socket.join(userId);
  broadcastOnlineUsers();
  socket.on("presence:sync", () => {
    socket.emit("online-users", getOnlineUserIds());
  });
  const conversationIds = await getUserConversationsForSocketIO(user._id);
  conversationIds.forEach((id) => {
    socket.join(id);
  });

  socket.on("join-conversation", (conversationId) => {
    socket.join(conversationId);
  });

  Object.entries(callEvents).forEach(([eventName, relayEvent]) => {
    socket.on(eventName, async (payload = {}) => {
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        socket.emit("call:error", { message: "Yêu cầu cuộc gọi không hợp lệ" });
        return;
      }
      const { conversationId, callId } = payload;
      if (
        typeof conversationId !== "string" ||
        !mongoose.Types.ObjectId.isValid(conversationId) ||
        typeof callId !== "string" ||
        callId.length === 0 ||
        callId.length > 128
      ) {
        socket.emit("call:error", { message: "Yêu cầu cuộc gọi không hợp lệ" });
        return;
      }
      if (
        eventName === "call:invite" &&
        payload.kind !== "audio" &&
        payload.kind !== "video"
      ) {
        socket.emit("call:error", {
          callId,
          message: "Loại cuộc gọi không hợp lệ",
        });
        return;
      }
      const description =
        eventName === "call:offer"
          ? payload.offer
          : eventName === "call:answer"
            ? payload.answer
            : null;
      if (
        (eventName === "call:offer" || eventName === "call:answer") &&
        (!description || typeof description.sdp !== "string")
      ) {
        socket.emit("call:error", {
          callId,
          message: "Thông tin kết nối cuộc gọi không hợp lệ",
        });
        return;
      }
      if (
        eventName === "call:ice-candidate" &&
        typeof payload.candidate?.candidate !== "string"
      ) {
        socket.emit("call:error", {
          callId,
          message: "Thông tin mạng cuộc gọi không hợp lệ",
        });
        return;
      }

      if (eventName !== "call:invite") {
        const call = activeCalls.get(callId);
        if (
          !call ||
          call.conversationId !== conversationId ||
          (call.callerId !== userId && call.calleeId !== userId)
        ) {
          return;
        }
        if (
          eventName === "call:accept" ||
          eventName === "call:reject"
        ) {
          if (userId !== call.calleeId) return;
          if (eventName === "call:accept") {
            if (call.acceptedAt) return;
            call.acceptedAt = new Date();
            clearTimeout(call.timeout);
            call.timeout = setTimeout(() => {
              finishCall(call, "cancelled").then(() => {
                io.to(call.callerId).emit("call:ended", { callId });
                io.to(call.calleeId).emit("call:ended", { callId });
              });
            }, 60_000);
          } else {
            if (call.acceptedAt) return;
            await finishCall(call, "rejected");
          }
        } else if (eventName === "call:end") {
          await finishCall(
            call,
            call.connectedAt
              ? "completed"
              : userId === call.callerId
                ? "cancelled"
                : "rejected",
          );
        } else if (eventName === "call:connected") {
          if (!call.acceptedAt) return;
          if (!call.connectedAt) call.connectedAt = new Date();
          clearTimeout(call.timeout);
        } else if (!call.acceptedAt) {
          return;
        }

        const relayPayload = { callId, conversationId };
        if (eventName === "call:offer") relayPayload.offer = payload.offer;
        if (eventName === "call:answer") relayPayload.answer = payload.answer;
        if (eventName === "call:ice-candidate") {
          relayPayload.candidate = payload.candidate;
        }
        io.to(userId === call.callerId ? call.calleeId : call.callerId).emit(
          relayEvent,
          relayPayload,
        );
        return;
      }

      if (activeCalls.has(callId)) {
        socket.emit("call:error", {
          callId,
          message: "Cuộc gọi không hợp lệ hoặc đã tồn tại",
        });
        return;
      }

      try {
        const conversation = await Conversation.findById(conversationId).populate(
          "participants.userId",
          "displayName avatarUrl blockedUsers",
        );
        if (
          !conversation ||
          conversation.type !== "direct" ||
          conversation.participants.length !== 2
        ) {
          socket.emit("call:error", {
            callId,
            message: "Chỉ hỗ trợ gọi trong cuộc trò chuyện cá nhân",
          });
          return;
        }

        const participants = conversation.participants.map(
          (participant) => participant.userId,
        );
        const caller = participants.find(
          (participant) => participant._id.toString() === userId,
        );
        const recipient = participants.find(
          (participant) => participant._id.toString() !== userId,
        );
        if (!caller || !recipient) {
          socket.emit("call:error", {
            callId,
            message: "Bạn không thuộc cuộc trò chuyện này",
          });
          return;
        }

        const isBlocked =
          caller.blockedUsers.some(
            (blockedId) => blockedId.toString() === recipient._id.toString(),
          ) ||
          recipient.blockedUsers.some(
            (blockedId) => blockedId.toString() === caller._id.toString(),
          );
        if (isBlocked) {
          socket.emit("call:unavailable", { callId });
          return;
        }

        const recipientId = recipient._id.toString();
        if (eventName === "call:invite") {
          const recipientSockets = await io.in(recipientId).fetchSockets();
          if (recipientSockets.length === 0) {
            socket.emit("call:unavailable", { callId });
            return;
          }
          const call = {
            callId,
            conversationId,
            kind: payload.kind,
            callerId: userId,
            calleeId: recipientId,
            acceptedAt: null,
            connectedAt: null,
            timeout: null,
          };
          call.timeout = setTimeout(() => {
            finishCall(call, "missed").then(() => {
              io.to(call.callerId).emit("call:unavailable", { callId });
              io.to(call.calleeId).emit("call:ended", { callId });
            });
          }, 30_000);
          activeCalls.set(callId, call);
        }

        io.to(recipientId).emit(relayEvent, {
          ...payload,
          from: {
            userId,
            displayName: caller.displayName,
            avatarUrl: caller.avatarUrl ?? null,
          },
        });
      } catch (error) {
        console.error(`Lỗi xử lý sự kiện ${eventName}:`, error);
        socket.emit("call:error", {
          callId,
          message: "Không thể xử lý yêu cầu cuộc gọi",
        });
      }
    });
  });

  socket.on("disconnect", () => {
    const sockets = onlineUser.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
    }
    if (sockets?.size === 0) {
      onlineUser.delete(userId);
      broadcastOnlineUsers();
    }
    console.log(`socket disconnected: ${socket.id}`);
  });
});

export { io, app, server, onlineUser };
