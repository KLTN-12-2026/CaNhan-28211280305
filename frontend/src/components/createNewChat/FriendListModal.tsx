import { DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { MessageCircleMore } from "lucide-react";
import FriendsListPanel from "../chat/FriendsListPanel";

const FriendListModal = () => {
  return (
    <DialogContent className="max-w-md border-border/60 bg-background/95 p-0 shadow-2xl backdrop-blur-xl">
      <div className="border-b border-border/60 bg-gradient-to-r from-primary/8 via-transparent to-violet-500/10 p-5">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
              <MessageCircleMore className="size-5" />
            </div>
            Bắt đầu hội thoại mới
          </DialogTitle>
        </DialogHeader>
      </div>

      <div className="space-y-4 p-4">
        <FriendsListPanel />
      </div>
    </DialogContent>
  );
};

export default FriendListModal;
