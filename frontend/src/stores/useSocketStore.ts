import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "./useAuthStore";
import type { SocketState } from "@/types/store";
import { useChatStore } from "./useChatStore";
import { useAudioCallStore } from "./useAudioCallStore";
import { toast } from "sonner";

const baseUrl = import.meta.env.VITE_SOCKET_URL;

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  onlineUsers: [],
  typingUsers: {},
  connectSocket: () => {
    const accessToken = useAuthStore.getState().accessToken;
    const existingSocket = get().socket;
    if (existingSocket) return;
    const socket: Socket = io(baseUrl, {
      auth: { token: accessToken },
      transports: ["websocket"],
    });
    set({ socket });
    socket.on("connect", () => {
      console.log("Đã kết nối với socket");
      socket.emit("presence:sync");
    });
    socket.on("online-users", (userIds) => {
      if (Array.isArray(userIds)) {
        set({ onlineUsers: userIds.map(String) });
      }
    });
    socket.on("disconnect", () => {
      set({ onlineUsers: [], typingUsers: {} });
    });
    socket.on("typing:start", ({ conversationId, userId, displayName }) => {
      if (
        typeof conversationId !== "string" ||
        typeof userId !== "string" ||
        typeof displayName !== "string"
      ) {
        return;
      }
      set((state) => {
        const users = state.typingUsers[conversationId] ?? [];
        return {
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: [
              ...users.filter((user) => user.userId !== userId),
              { userId, displayName },
            ],
          },
        };
      });
    });
    socket.on("typing:stop", ({ conversationId, userId }) => {
      if (typeof conversationId !== "string" || typeof userId !== "string") {
        return;
      }
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: (state.typingUsers[conversationId] ?? []).filter(
            (user) => user.userId !== userId,
          ),
        },
      }));
    });
    socket.on("new-message", ({ message, conversation, unreadCounts }) => {
      const chatStore = useChatStore.getState();
      const exists = chatStore.conversations.some(
        (c) => c._id.toString() === message.conversationId.toString(),
      );

      if (!exists) {
        chatStore.fetchConversations();
      }

      chatStore.addMessage(message);
      const lastMessage = {
        _id: conversation.lastMessage._id,
        content: conversation.lastMessage.content,
        imgUrl: conversation.lastMessage.imgUrl,
        createdAt: conversation.lastMessage.createdAt,
        sender: {
          _id: conversation.lastMessage.senderId,
          displayName: "",
          avatarUrl: null,
        },
      };
      const updatedConversation = {
        ...conversation,
        lastMessage,
        unreadCounts,
      };
      if (chatStore.activeConversationId === message.conversationId) {
        chatStore.markAsSeen();
      }
      chatStore.updateConversation(updatedConversation);
    });
    socket.on("read-message", ({ conversation, lastMessage }) => {
      const updated = {
        _id: conversation._id,
        lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        unreadCounts: conversation.unreadCounts,
        seenBy: conversation.seenBy,
      };
      useChatStore.getState().updateConversation(updated);
    });
    socket.on("new-group", (conversation) => {
      useChatStore.getState().addConvo(conversation);
      socket.emit("join-conversation", conversation._id);
    });
    socket.on("call:incoming", (payload) => {
      useAudioCallStore.getState().receiveInvite(payload, socket);
    });
    socket.on("call:accepted", ({ callId }) => {
      useAudioCallStore
        .getState()
        .receiveAccepted(socket, callId)
        .catch((error) => {
          console.error("Lỗi khi tạo kết nối cuộc gọi:", error);
          toast.error("Không thể bắt đầu cuộc gọi");
        });
    });
    socket.on("call:offer", (payload) => {
      useAudioCallStore
        .getState()
        .receiveOffer(socket, payload)
        .catch((error) => {
          console.error("Lỗi khi nhận offer cuộc gọi:", error);
          toast.error("Không thể thiết lập cuộc gọi");
        });
    });
    socket.on("call:answer", (payload) => {
      useAudioCallStore
        .getState()
        .receiveAnswer(payload)
        .catch((error) => {
          console.error("Lỗi khi nhận answer cuộc gọi:", error);
          useAudioCallStore.getState().endCall(socket);
          toast.error("Không thể thiết lập cuộc gọi");
        });
    });
    socket.on("call:ice-candidate", (payload) => {
      useAudioCallStore
        .getState()
        .receiveCandidate(payload)
        .catch((error) => {
          console.error("Lỗi khi xử lý ICE candidate:", error);
          useAudioCallStore.getState().endCall(socket);
          toast.error("Kết nối mạng cuộc gọi gặp sự cố");
        });
    });
    socket.on("call:rejected", ({ callId }) => {
      const call = useAudioCallStore.getState().call;
      if (call?.callId !== callId) return;
      useAudioCallStore.getState().setRemoteEnded(callId);
      toast.info("Người nhận đã từ chối cuộc gọi");
    });
    socket.on("call:unavailable", ({ callId }) => {
      const call = useAudioCallStore.getState().call;
      if (call?.callId !== callId) return;
      useAudioCallStore.getState().setRemoteEnded(callId);
      toast.info("Người nhận hiện không thể nhận cuộc gọi");
    });
    socket.on("call:ended", ({ callId }) => {
      const call = useAudioCallStore.getState().call;
      if (call?.callId !== callId) return;
      useAudioCallStore.getState().setRemoteEnded(callId);
      toast.info("Cuộc gọi đã kết thúc");
    });
    socket.on("call:error", ({ callId, message }) => {
      const call = useAudioCallStore.getState().call;
      if (callId && call?.callId !== callId) return;
      useAudioCallStore.getState().endCall(socket, false);
      toast.error(message || "Không thể thực hiện cuộc gọi");
    });
  },
  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      useAudioCallStore.getState().endCall(socket, false);
      socket.disconnect();
      set({ socket: null, onlineUsers: [], typingUsers: {} });
    }
  },
}));
