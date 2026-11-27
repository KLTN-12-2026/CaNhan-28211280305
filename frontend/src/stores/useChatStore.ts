import { chatService } from "@/services/chatService";
import type { ChatState } from "@/types/store";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "./useAuthStore";
import { useSocketStore } from "./useSocketStore";

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      messages: {},
      activeConversationId: null,
      convoLoading: false,
      messageLoading: false,
      loading: false,
      setActiveConversation: (id) => set({ activeConversationId: id }),
      reset: () => {
        set({
          conversations: [],
          messages: {},
          activeConversationId: null,
          convoLoading: false,
          messageLoading: false,
        });
      },
      fetchConversations: async () => {
        try {
          set({ convoLoading: true });
          const { conversations } = await chatService.fetchConversations();
          set({ conversations, convoLoading: false });
        } catch (error) {
          console.error("Lỗi xãy ra khi fetchConversations:", error);
          set({ convoLoading: false });
        }
      },
      fetchMessages: async (conversationId) => {
        const { activeConversationId, messages } = get();
        const { user } = useAuthStore.getState();
        const convoId = conversationId ?? activeConversationId;
        if (!convoId) return;
        const current = messages?.[convoId];
        const nextCursor =
          current?.nextCursor === undefined ? "" : current?.nextCursor;
        if (nextCursor === null) return;
        set({ messageLoading: true });
        try {
          const { messages: fetched, cursor } = await chatService.fetchMessages(
            convoId,
            nextCursor,
          );
          const processed = fetched.map((m) => ({
            ...m,
            isOwn: m.senderId === user?._id,
          }));
          set((state) => {
            const prev = state.messages[convoId]?.items ?? [];
            const merged =
              prev.length > 0 ? [...processed, ...prev] : processed;
            return {
              messages: {
                ...state.messages,
                [convoId]: {
                  items: merged,
                  hasMore: !!cursor,
                  nextCursor: cursor ?? null,
                },
              },
            };
          });
        } catch (error) {
          console.error("Lỗi xãy ra khi fetchMessages:", error);
        } finally {
          set({ messageLoading: false });
        }
      },
      sendDirectMessage: async (recipentId, content, imgUrl, replyToId) => {
        try {
          const { activeConversationId } = get();
          await chatService.sendDirectMessage(
            recipentId,
            content,
            imgUrl,
            activeConversationId || undefined,
            replyToId,
          );
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c._id === activeConversationId ? { ...c, seenBy: [] } : c,
            ),
          }));
        } catch (error) {
          console.error("Lỗi xãy ra khi gửi DirectMessage", error);
          throw error;
        }
      },
      sendGroupMessage: async (conversationId, content, imgUrl, replyToId) => {
        try {
          await chatService.sendGroupMessage(
            conversationId,
            content,
            imgUrl,
            replyToId,
          );
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c._id === get().activeConversationId ? { ...c, seenBy: [] } : c,
            ),
          }));
        } catch (error) {
          console.error("Lỗi xãy ra khi gửi GroupMessage", error);
          throw error;
        }
      },
      addMessage: async (message) => {
        try {
          const { user } = useAuthStore.getState();
          const { fetchMessages } = get();
          message.isOwn = message.senderId === user?._id;
          const convoId = message.conversationId;
          let prevItems = get().messages[convoId]?.items ?? [];
          if (prevItems.length === 0) {
            await fetchMessages(message.conversationId);
            prevItems = get().messages[convoId]?.items ?? [];
          }
          set((state) => {
            if (prevItems.some((m) => m._id === message._id)) {
              return state;
            }
            return {
              messages: {
                ...state.messages,
                [convoId]: {
                  items: [...prevItems, message],
                  hasMore: state.messages[convoId].hasMore,
                  nextCursor: state.messages[convoId].nextCursor ?? undefined,
                },
              },
            };
          });
        } catch (error) {
          console.error("Lỗi xảy ra khi add message", error);
        }
      },
      updateConversation: (conversation) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c._id === conversation._id ? { ...c, ...conversation } : c,
          ),
        }));
      },
      markAsSeen: async () => {
        try {
          const { user } = useAuthStore.getState();
          const { activeConversationId, conversations } = get();
          if (!activeConversationId || !user) return;
          const convo = conversations.find(
            (c) => c._id === activeConversationId,
          );
          if (!convo) return;
          if ((convo.unreadCounts?.[user._id] ?? 0) === 0) return;
          await chatService.markAsSeen(activeConversationId);
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c._id === activeConversationId && c.lastMessage
                ? {
                    ...c,
                    unreadCounts: {
                      ...c.unreadCounts,
                      [user._id]: 0,
                    },
                  }
                : c,
            ),
          }));
        } catch (error) {
          console.error("Lỗi xảy ra khi markAsSeen:", error);
        }
      },
      addConvo: (convo) => {
        set((state) => {
          const exists = state.conversations.some(
            (c) => c._id.toString() === convo._id.toString(),
          );
          return {
            conversations: exists
              ? state.conversations
              : [convo, ...state.conversations],
            activeConversationId: convo._id,
          };
        });
      },
      createConversation: async (type, name, memberIds) => {
        try {
          set({ loading: true });
          const conversation = await chatService.createConversation(
            type,
            name,
            memberIds,
          );
          get().addConvo(conversation);
          useSocketStore
            .getState()
            .socket?.emit("join-conversation", conversation._id);
        } catch (error) {
          console.error("Lỗi xãy ra khi gọi createConversation: ", error);
          throw error;
        } finally {
          set({ loading: false });
        }
      },
      leaveGroup: async (conversationId) => {
        try {
          await chatService.leaveGroup(conversationId);
          set((state) => ({
            conversations: state.conversations.filter(
              (c) => c._id !== conversationId,
            ),
            activeConversationId:
              state.activeConversationId === conversationId
                ? null
                : state.activeConversationId,
          }));
        } catch (error) {
          console.error("Lỗi xãy ra khi rời nhóm: ", error);
        }
      },
      deleteConversation: async (conversationId) => {
        try {
          await chatService.deleteConversation(conversationId);
          set((state) => ({
            conversations: state.conversations.filter(
              (c) => c._id !== conversationId,
            ),
            activeConversationId:
              state.activeConversationId === conversationId
                ? null
                : state.activeConversationId,
          }));
        } catch (error) {
          console.error("Lỗi xãy ra khi xóa cuộc trò chuyện: ", error);
        }
      },
      addMembers: async (conversationId, newMemberIds) => {
        try {
          const { conversation } = await chatService.addMembers(
            conversationId,
            newMemberIds,
          );
          get().updateConversation(conversation);
        } catch (error) {
          console.error("Lỗi xãy ra khi thêm thành viên: ", error);
        }
      },
      removeMember: async (conversationId, memberId) => {
        try {
          await chatService.removeMember(conversationId, memberId);
          const conversation = get().conversations.find(
            (c) => c._id === conversationId,
          );
          if (conversation) {
            const updatedParticipants = conversation.participants.filter(
              (p) => p._id !== memberId,
            );
            get().updateConversation({
              ...conversation,
              participants: updatedParticipants,
            });
          }
        } catch (error) {
          console.error("Lỗi xãy ra khi xóa thành viên: ", error);
        }
      },
      transferOwnership: async (conversationId, newOwnerId) => {
        try {
          await chatService.transferOwnership(conversationId, newOwnerId);
          const conversation = get().conversations.find(
            (c) => c._id === conversationId,
          );
          if (conversation && conversation.group) {
            get().updateConversation({
              ...conversation,
              group: { ...conversation.group, createBy: newOwnerId },
            });
          }
        } catch (error) {
          console.error("Lỗi xãy ra khi chuyển quyền trưởng nhóm: ", error);
        }
      },
      isGeneratingReplies: false,
      smartReplies: [],
      generateSmartReplies: async (conversationId) => {
        try {
          set({ isGeneratingReplies: true });
          const { aiService } = await import("@/services/aiService");
          const suggestions = await aiService.getSmartReplies(conversationId);
          set({ smartReplies: suggestions });
        } catch (error) {
          console.error("Failed to generate smart replies:", error);
        } finally {
          set({ isGeneratingReplies: false });
        }
      },
      clearSmartReplies: () => set({ smartReplies: [] }),
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({ conversations: state.conversations }),
    },
  ),
);
