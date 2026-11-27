import { Ban, ChevronsUpDown, UserIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { userService } from "@/services/userService";
import type { BlockedUser, User } from "@/types/user";
import Logout from "../auth/Logout";
import { useEffect, useState } from "react";
import ProfileDialog from "../profile/ProfileDialog";
import { toast } from "sonner";

export function NavUser({ user }: { user: User }) {
  const { isMobile } = useSidebar();
  const setUser = useAuthStore((state) => state.setUser);
  const [blockedUsersOpen, setBlockedUsersOpen] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedUsersLoading, setBlockedUsersLoading] = useState(false);
  const [blockedUsersError, setBlockedUsersError] = useState(false);
  const [blockedUsersRetry, setBlockedUsersRetry] = useState(0);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!blockedUsersOpen) return;

    let active = true;
    setBlockedUsersLoading(true);
    setBlockedUsersError(false);
    userService
      .getBlockedUsers()
      .then((users) => {
        if (active) setBlockedUsers(users);
      })
      .catch((error) => {
        console.error("Không thể tải danh sách người dùng bị chặn:", error);
        if (active) {
          setBlockedUsersError(true);
          toast.error("Không thể tải danh sách chặn");
        }
      })
      .finally(() => {
        if (active) setBlockedUsersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [blockedUsersOpen, blockedUsersRetry]);

  const handleUnblock = async (blockedUser: BlockedUser) => {
    try {
      setUnblockingUserId(blockedUser._id);
      const result = await userService.unblockUser(blockedUser._id);
      setBlockedUsers((current) =>
        current.filter((item) => item._id !== blockedUser._id),
      );
      setUser({ ...user, blockedUsers: result.blockedUsers });
      const { conversations, updateConversation } = useChatStore.getState();
      conversations
        .filter(
          (conversation) =>
            conversation.type === "direct" &&
            conversation.participants.some(
              (participant) => participant._id === blockedUser._id,
            ),
        )
        .forEach((conversation) =>
          updateConversation({ ...conversation, isBlocked: result.isBlocked }),
        );
      if (result.isBlocked) {
        toast.info(
          `Đã bỏ chặn ${blockedUser.displayName}, nhưng người này vẫn đang chặn bạn nên chưa thể nhắn tin.`,
        );
      } else {
        toast.success(`Đã bỏ chặn ${blockedUser.displayName}`);
      }
    } catch (error) {
      console.error("Không thể bỏ chặn người dùng:", error);
      toast.error("Không thể bỏ chặn người dùng");
    } finally {
      setUnblockingUserId(null);
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                  <AvatarFallback className="rounded-lg">
                    {user.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.displayName}
                  </span>
                  <span className="truncate text-xs">{user.username}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatarUrl} alt={user.username} />
                    <AvatarFallback className="rounded-lg">
                      {user.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user.displayName}
                    </span>
                    <span className="truncate text-xs">{user.username}</span>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <UserIcon className="text-muted-foreground dark:group-focus:!text-accent-foreground" />
                  Tài Khoản
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBlockedUsersOpen(true)}>
                  <Ban className="text-muted-foreground dark:group-focus:!text-accent-foreground" />
                  Danh sách chặn
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                variant="destructive"
              >
                <Logout />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={blockedUsersOpen} onOpenChange={setBlockedUsersOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Danh sách chặn</DialogTitle>
            <DialogDescription>
              Những người bạn đã chặn sẽ không thể nhắn tin cho bạn.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {blockedUsersLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Đang tải danh sách chặn...
              </p>
            ) : blockedUsersError ? (
              <div className="space-y-3 py-6 text-center">
                <p className="text-sm text-destructive">
                  Không thể tải danh sách chặn.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBlockedUsersRetry((count) => count + 1)}
                >
                  Thử lại
                </Button>
              </div>
            ) : blockedUsers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Bạn chưa chặn người dùng nào.
              </p>
            ) : (
              blockedUsers.map((blockedUser) => (
                <div
                  key={blockedUser._id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Avatar className="size-10">
                    <AvatarImage
                      src={blockedUser.avatarUrl}
                      alt={blockedUser.displayName}
                    />
                    <AvatarFallback>
                      {blockedUser.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {blockedUser.displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{blockedUser.username}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={unblockingUserId !== null}
                    onClick={() => void handleUnblock(blockedUser)}
                  >
                    {unblockingUserId === blockedUser._id
                      ? "Đang bỏ chặn..."
                      : "Bỏ chặn"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
      <ProfileDialog open={profileOpen} setOpen={setProfileOpen} />
    </>
  );
}
