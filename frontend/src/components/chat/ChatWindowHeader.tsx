import { useChatStore } from "@/stores/useChatStore";
import GroupInfo from "./GroupInfo";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Conversation, Participant } from "@/types/chat";
import { useSocketStore } from "@/stores/useSocketStore";
import UserAvatar from "./UserAvatar";
import StatusBadge from "./StatusBadge";
import { Separator } from "@/components/ui/separator";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  MoreVertical,
  Trash2,
  ShieldBan,
  ShieldCheck,
  Phone,
  Video,
} from "lucide-react";
import { SidebarTrigger } from "../ui/sidebar";
import GroupChatAvatar from "./GroupChatAvatar";
import { toast } from "sonner";
import { useState } from "react";
import { Flag } from "lucide-react";
import { ReportModal } from "../report/ReportModal";
import { userService } from "@/services/userService";
import { useAudioCallStore } from "@/stores/useAudioCallStore";
import { getCallMediaErrorMessage } from "@/lib/callMedia";

const ChatWindowHeader = ({ chat }: { chat?: Conversation }) => {
  const {
    conversations,
    activeConversationId,
    deleteConversation,
    updateConversation,
  } = useChatStore();
  const { user, setUser } = useAuthStore();
  const { onlineUsers, socket } = useSocketStore();
  const { call, startCall } = useAudioCallStore();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  let otherUser: Participant | null = null;
  chat = chat ?? conversations.find((c) => c._id === activeConversationId);

  if (!chat) {
    return (
      <header className="md:hidden sticky top-0 z-10 flex items-center gap-2 px-4 py-2 w-full">
        <SidebarTrigger className="-ml-1 text-foreground" />
      </header>
    );
  }

  if (chat.type === "direct") {
    const otherUsers = chat.participants.filter((p) => p._id !== user?._id);
    otherUser = otherUsers.length > 0 ? otherUsers[0] : null;
    if (!user || !otherUser) return null;
  }

  const isOtherUserBlocked = Boolean(
    otherUser && user?.blockedUsers?.includes(otherUser._id),
  );

  const handleToggleBlock = async () => {
    if (!user || !otherUser) return;
    try {
      const result = isOtherUserBlocked
        ? await userService.unblockUser(otherUser._id)
        : await userService.blockUser(otherUser._id);
      setUser({ ...user, blockedUsers: result.blockedUsers });
      updateConversation({ ...chat, isBlocked: result.isBlocked });
      toast.success(
        isOtherUserBlocked ? "Đã bỏ chặn người dùng" : "Đã chặn người dùng",
      );
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái chặn:", error);
      toast.error("Không thể cập nhật trạng thái chặn");
    }
  };

  const handleDeleteConversation = async () => {
    try {
      if (!chat) return;
      await deleteConversation(chat._id);
      toast.success("Đã xóa cuộc trò chuyện");
    } catch (error) {
      toast.error("Lỗi khi xóa cuộc trò chuyện");
    }
  };

  const handleStartCall = async (kind: "audio" | "video") => {
    if (!socket || !otherUser || !chat || call) return;
    try {
      await startCall(socket, chat._id, {
        userId: otherUser._id,
        displayName: otherUser.displayName,
        avatarUrl: otherUser.avatarUrl,
      }, kind);
    } catch (error) {
      console.error(`Không thể bắt đầu cuộc gọi ${kind}:`, error);
      toast.error(getCallMediaErrorMessage(error, kind));
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 px-4 py-2 flex items-center bg-background justify-between">
        <div className="flex items-center gap-2 w-full">
          <SidebarTrigger className="-mt-1 text-foreground" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <div className="p-2 w-full flex items-center gap-3">
            {/* avatar */}
            <div className="relative">
              {chat.type === "direct" ? (
                <>
                  <UserAvatar
                    type={"sidebar"}
                    name={otherUser?.displayName}
                    avatarUrl={otherUser?.avatarUrl || undefined}
                  />
                  <StatusBadge
                    status={
                      onlineUsers.includes(otherUser?._id ?? "")
                        ? "online"
                        : "offline"
                    }
                  />
                </>
              ) : (
                <GroupChatAvatar
                  participants={chat.participants}
                  type="sidebar"
                />
              )}
            </div>
            {/* name */}
            <h2 className="font-semibold text-foreground">
              {chat.type === "direct"
                ? otherUser?.displayName
                : chat.group?.name}
            </h2>
          </div>
        </div>

        {chat.type === "group" && <GroupInfo chat={chat} />}

        {chat.type === "direct" && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Gọi âm thanh"
            title="Gọi âm thanh"
            disabled={
              !otherUser ||
              !socket ||
              Boolean(call) ||
              isOtherUserBlocked ||
              !onlineUsers.includes(otherUser?._id ?? "")
            }
            onClick={() => handleStartCall("audio")}
          >
            <Phone className="size-4" />
          </Button>
        )}

        {chat.type === "direct" && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Gọi video"
            title="Gọi video"
            disabled={
              !otherUser ||
              !socket ||
              Boolean(call) ||
              isOtherUserBlocked ||
              !onlineUsers.includes(otherUser?._id ?? "")
            }
            onClick={() => handleStartCall("video")}
          >
            <Video className="size-4" />
          </Button>
        )}

        {chat.type === "direct" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleToggleBlock}
                className="text-red-500 cursor-pointer"
              >
                {isOtherUserBlocked ? (
                  <ShieldCheck className="size-4 mr-2" />
                ) : (
                  <ShieldBan className="size-4 mr-2" />
                )}
                {isOtherUserBlocked ? "Bỏ chặn người dùng" : "Chặn người dùng"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsReportModalOpen(true)}
                className="text-red-500 cursor-pointer"
              >
                <Flag className="size-4 mr-2" />
                Báo cáo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDeleteConversation}
                className="text-red-500 cursor-pointer"
              >
                <Trash2 className="size-4 mr-2" />
                Xóa cuộc trò chuyện
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {/* Report Modal */}
      {isReportModalOpen && otherUser && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetType="user"
          targetId={otherUser._id}
        />
      )}
    </>
  );
};

export default ChatWindowHeader;
