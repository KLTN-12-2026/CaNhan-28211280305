import { useMemo, useState } from "react";
import {
  ArrowRight,
  MessageCircleMore,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useFriendStore } from "@/stores/useFriendStore";
import { useChatStore } from "@/stores/useChatStore";
import type { Friend } from "@/types/user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UserAvatar from "./UserAvatar";
import { useAuthStore } from "@/stores/useAuthStore";

interface FriendsListPanelProps {
  onSelectFriend?: () => void;
}

const FriendsListPanel = ({ onSelectFriend }: FriendsListPanelProps) => {
  const { friends, loading, deleteFriend } = useFriendStore();
  const { createConversation } = useChatStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [friendToDelete, setFriendToDelete] = useState<Friend | null>(null);
  const currentUser = useAuthStore((state) => state.user);

  const filteredFriends = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return friends.filter((friend) => {
      if (friend._id === currentUser?._id) return false;
      return (
        friend.displayName.toLowerCase().includes(search) ||
        friend.username.toLowerCase().includes(search)
      );
    });
  }, [friends, searchTerm, currentUser?._id]);

  const handleAddConversation = async (friendId: string) => {
    try {
      await createConversation("direct", "", [friendId]);
      onSelectFriend?.();
    } catch (error) {
      console.error("Lỗi khi mở hội thoại với bạn bè:", error);
      toast.error("Không thể mở hội thoại");
    }
  };

  const handleDeleteFriend = (event: React.MouseEvent, friend: Friend) => {
    event.stopPropagation();
    if (friend._id === currentUser?._id) {
      toast.error("Bạn không thể xóa chính mình khỏi danh sách bạn bè");
      return;
    }
    setFriendToDelete(friend);
  };

  const confirmDeleteFriend = async () => {
    if (!friendToDelete) return;
    if (friendToDelete._id === currentUser?._id) {
      toast.error("Bạn không thể xóa chính mình khỏi danh sách bạn bè");
      setFriendToDelete(null);
      return;
    }
    try {
      await deleteFriend(friendToDelete._id);
      setFriendToDelete(null);
    } catch (error) {
      console.error("Lỗi khi xóa bạn:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Tìm trong danh sách bạn bè..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="h-11 rounded-xl border-border/60 bg-muted/30 pl-9 text-sm shadow-sm transition focus-visible:ring-primary/20"
        />
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Danh sách bạn bè
        </span>
        <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {filteredFriends.length}
        </span>
      </div>

      <div className="max-h-[min(50vh,420px)] space-y-2.5 overflow-y-auto pr-1">
        {loading && friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
            Đang tải danh sách bạn bè...
          </div>
        ) : filteredFriends.length > 0 ? (
          filteredFriends.map((friend) => (
            <Card
              key={friend._id}
              onClick={() => handleAddConversation(friend._id)}
              className="group/friendCard cursor-pointer border border-transparent bg-muted/20 p-3 shadow-none transition-all duration-200 hover:border-primary/20 hover:bg-primary/5 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <UserAvatar
                    type="chat"
                    name={friend.displayName}
                    avatarUrl={friend.avatarUrl}
                    className="size-12 shrink-0 border-2 border-background shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold text-foreground">
                      {friend.displayName}
                    </h2>
                    <p className="truncate text-xs text-muted-foreground">
                      @{friend.username}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary sm:inline-flex">
                    <MessageCircleMore className="mr-1 size-3" />
                    Nhắn tin
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(event) =>
                      handleDeleteFriend(event, friend)
                    }
                    className="h-8 w-8 rounded-full text-muted-foreground opacity-60 transition hover:bg-destructive/10 hover:text-destructive group-hover/friendCard:opacity-100"
                    title="Xóa bạn"
                    aria-label={`Xóa ${friend.displayName} khỏi danh sách bạn bè`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover/friendCard:bg-primary group-hover/friendCard:text-primary-foreground">
                    <ArrowRight className="size-4" />
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center text-muted-foreground">
            <div className="mb-3 rounded-full bg-muted p-4">
              <Users className="size-8 opacity-60" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {searchTerm
                ? "Không tìm thấy bạn bè phù hợp."
                : "Chưa có bạn bè nào."}
            </p>
            <p className="mt-1 text-xs">
              {searchTerm
                ? "Thử từ khóa khác để tìm kiếm."
                : "Chuyển sang tab Tìm bạn để gửi lời mời kết bạn."}
            </p>
          </div>
        )}
      </div>

      <Dialog
        open={friendToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setFriendToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa bạn bè</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa{" "}
              <span className="font-semibold text-foreground">
                {friendToDelete?.displayName}
              </span>{" "}
              khỏi danh sách bạn bè không? Bạn có thể gửi lời mời kết bạn lại
              sau.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFriendToDelete(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteFriend}
            >
              <Trash2 className="size-4" />
              Xóa bạn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FriendsListPanel;
