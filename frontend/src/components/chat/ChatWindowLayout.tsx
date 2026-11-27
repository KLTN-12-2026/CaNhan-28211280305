import { useChatStore } from "@/stores/useChatStore";
import ChatWelcomeScreen from "./ChatWelcomeScreen";
import { SidebarInset } from "../ui/sidebar";
import ChatWindowHeader from "./ChatWindowHeader";
import ChatWindowBody from "./ChatWindowBody";
import MessageInput from "./MessageInput";
import { useEffect, useState } from "react";
import ChatWindowSkeleton from "../skeleton/ChatWindowSkeleton";
import type { Message } from "@/types/chat";
import { useSocketStore } from "@/stores/useSocketStore";
import { useAuthStore } from "@/stores/useAuthStore";

const ChatWindowLayout = () => {
  const {
    activeConversationId,
    conversations,
    messageLoading: loading,
    markAsSeen,
  } = useChatStore();

  const selectedConvo =
    conversations.find((c) => c._id === activeConversationId) ?? null;
  const { socket, typingUsers } = useSocketStore();
  const currentUserId = useAuthStore((state) => state.user?._id);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const conversationTypingUsers = activeConversationId
    ? (typingUsers[activeConversationId] ?? []).filter(
        (typingUser) => typingUser.userId !== currentUserId,
      )
    : [];
  const typingText =
    conversationTypingUsers.length === 1
      ? `${conversationTypingUsers[0].displayName} đang nhập...`
      : conversationTypingUsers.length === 2
        ? `${conversationTypingUsers[0].displayName} và ${conversationTypingUsers[1].displayName} đang nhập...`
        : conversationTypingUsers.length > 2
          ? `${conversationTypingUsers.length} người đang nhập...`
          : null;

  useEffect(() => {
    setReplyTo(null);
  }, [activeConversationId]);

  useEffect(() => {
    if (socket && selectedConvo) {
      socket.emit("join-conversation", selectedConvo._id);
    }
  }, [selectedConvo?._id, socket]);

  useEffect(() => {
    if (!selectedConvo) {
      return;
    }
    const markSeen = async () => {
      try {
        await markAsSeen();
      } catch (error) {
        console.error("Lỗi khi đánh dấu đã xem cuộc trò chuyện:", error);
      }
    };
    markSeen();
  }, [markAsSeen, selectedConvo]);
  if (!selectedConvo) {
    return <ChatWelcomeScreen />;
  }
  if (loading) {
    return <ChatWindowSkeleton />;
  }
  return (
    <SidebarInset className="flex flex-col h-full flex-1 overflow-hidden rounded-sm shadow-md">
      <ChatWindowHeader chat={selectedConvo} />

      <div className="flex-1 overflow-y-auto bg-primary-foreground">
        <ChatWindowBody onReply={setReplyTo} />
      </div>

      {typingText && (
        <div aria-live="polite" className="px-4 text-xs text-muted-foreground">
          {typingText}
        </div>
      )}

      <MessageInput
        selectedConvo={selectedConvo}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />
    </SidebarInset>
  );
};

export default ChatWindowLayout;
