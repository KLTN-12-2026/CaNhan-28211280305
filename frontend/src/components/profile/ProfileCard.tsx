import type { User } from "@/types/user";
import { Card, CardContent } from "../ui/card";
import UserAvatar from "../chat/UserAvatar";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { useSocketStore } from "@/stores/useSocketStore";
import AvatarUploader from "./AvatarUploader";

interface ProfileCardProps {
  user: User | null;
}

const ProfileCard = ({ user }: ProfileCardProps) => {
  const { onlineUsers } = useSocketStore();
  if (!user) return;
  const isOnline = onlineUsers.includes(user._id) ? true : false;
  const bio = user.bio?.trim() || "Có làm mới có ăn";

  return (
    <Card className="h-28 overflow-hidden border-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-0">
      <CardContent className="flex h-full items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <div className="relative shrink-0">
          <UserAvatar
            type="profile"
            name={user.displayName}
            avatarUrl={user.avatarUrl ?? undefined}
            className="size-16 ring-4 ring-white shadow-lg sm:size-20"
          />
          <AvatarUploader />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
            {user.displayName}
          </h1>
          <p className="mt-1 truncate text-xs text-white/75 sm:text-sm">
            {bio}
          </p>
        </div>
        <Badge
          className={cn(
            "shrink-0 items-center gap-2 capitalize",
            "hidden sm:flex",
            isOnline
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-700"
          )}
        >
          <div
            className={cn(
              "size-2 rounded-full",
              isOnline ? "bg-green-500 animate-pulse" : "bg-slate-500"
            )}
          />
          {isOnline ? "Online" : "Offline"}
        </Badge>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
