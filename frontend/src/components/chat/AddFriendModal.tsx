import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Bell, Search, Users } from "lucide-react";
import type { User } from "@/types/user";
import { useFriendStore } from "@/stores/useFriendStore";
import { useForm } from "react-hook-form";
import SearchForm from "../addFriendModal/SearchForm";
import SendFriendRequestForm from "../addFriendModal/SendFriendRequestForm";
import FriendsListPanel from "./FriendsListPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import ReceivedRequests from "../friendRequest/ReceivedRequests";
import SentRequests from "../friendRequest/SentRequests";
import { useAuthStore } from "@/stores/useAuthStore";

export interface IFormValues {
  username: string;
  message: string;
}

type FriendManagerTab = "friends" | "search" | "requests";

interface AddFriendModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialTab?: FriendManagerTab;
  showTrigger?: boolean;
}

const AddFriendModal = ({
  open: controlledOpen,
  onOpenChange,
  initialTab = "friends",
  showTrigger = true,
}: AddFriendModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [activeTab, setActiveTab] = useState<FriendManagerTab>(initialTab);
  const [isFound, setIsFound] = useState<boolean | null>(null);
  const [searchUser, setSearchUser] = useState<User>();
  const [searchedUsername, setSearchedUsername] = useState("");
  const [isSelfSearch, setIsSelfSearch] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const {
    loading,
    receivedList,
    searchByUsername,
    addFriend,
    getFriends,
    getAllFriendRequests,
  } = useFriendStore();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<IFormValues>({
    defaultValues: { username: "", message: "" },
  });

  const usernameValue = watch("username");

  useEffect(() => {
    if (open) {
      void getFriends();
    }
  }, [open, getFriends]);

  useEffect(() => {
    if (open && activeTab === "requests") {
      void getAllFriendRequests();
    }
  }, [open, activeTab, getAllFriendRequests]);

  const handleSearch = handleSubmit(async (data) => {
    const username = data.username.trim();
    if (!username) return;
    setIsFound(null);
    setIsSelfSearch(false);
    setSearchedUsername(username);
    if (username.toLowerCase() === currentUser?.username?.toLowerCase()) {
      setIsFound(false);
      setIsSelfSearch(true);
      setSearchUser(undefined);
      return;
    }
    try {
      const foundUser = await searchByUsername(username);
      if (foundUser) {
        if (foundUser._id === currentUser?._id) {
          setIsFound(false);
          setIsSelfSearch(true);
          setSearchUser(undefined);
          return;
        }
        setIsFound(true);
        setSearchUser(foundUser);
      } else {
        setIsFound(false);
      }
    } catch (error) {
      console.error(error);
      setIsFound(false);
    }
  });

  const handleSend = handleSubmit(async (data) => {
    if (!searchUser) return;
    if (searchUser._id === currentUser?._id) {
      setIsFound(false);
      setIsSelfSearch(true);
      setSearchUser(undefined);
      return;
    }
    try {
      await addFriend(searchUser._id, data.message.trim());
      handleCancle();
    } catch (error) {
      console.error("Lỗi xãy ra khi gửi lời mời kết bạn:", error);
    }
  });

  const handleCancle = () => {
    reset();
    setSearchUser(undefined);
    setSearchedUsername("");
    setIsFound(null);
    setIsSelfSearch(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setActiveTab(initialTab);
    } else {
      handleCancle();
    }

    if (controlledOpen === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <div className="flex justify-center items-center size-5 rounded-full hover:bg-sidebar-accent cursor-pointer z-10">
            <Users className="size-4" />
            <span className="sr-only">Bạn bè và kết bạn</span>
          </div>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Bạn bè
          </DialogTitle>
        </DialogHeader>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (
              value === "friends" ||
              value === "search" ||
              value === "requests"
            ) {
              setActiveTab(value);
            }
          }}
          className="min-h-0"
        >
          <TabsList className="grid h-10 w-full grid-cols-3">
            <TabsTrigger value="friends" className="gap-2">
              <Users className="size-4" />
              Bạn bè
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <Search className="size-4" />
              Tìm bạn
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <Bell className="size-4" />
              Lời mời
              {receivedList.length > 0 && (
                <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] leading-none text-destructive-foreground">
                  {receivedList.length > 9 ? "9+" : receivedList.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="friends" className="mt-4">
            <FriendsListPanel onSelectFriend={() => handleOpenChange(false)} />
          </TabsContent>
          <TabsContent value="search" className="mt-4">
            {!isFound ? (
              <SearchForm
                register={register}
                errors={errors}
                usernameValue={usernameValue}
                loading={loading}
                isFound={isFound}
                isSelfSearch={isSelfSearch}
                searchedUsername={searchedUsername}
                onSubmit={handleSearch}
                onCancle={handleCancle}
              />
            ) : (
              <SendFriendRequestForm
                register={register}
                loading={loading}
                searchedUsername={searchedUsername}
                onSubmit={handleSend}
                onBack={() => {
                  setIsFound(null);
                  setSearchUser(undefined);
                }}
              />
            )}
          </TabsContent>
          <TabsContent value="requests" className="mt-4">
            <Tabs defaultValue="received" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="received">
                  Đã nhận ({receivedList.length})
                </TabsTrigger>
                <TabsTrigger value="sent">Đã gửi</TabsTrigger>
              </TabsList>
              <TabsContent
                value="received"
                className="mt-3 max-h-[min(45vh,360px)] overflow-y-auto"
              >
                {loading && receivedList.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Đang tải lời mời...
                  </p>
                ) : (
                  <ReceivedRequests />
                )}
              </TabsContent>
              <TabsContent
                value="sent"
                className="mt-3 max-h-[min(45vh,360px)] overflow-y-auto"
              >
                <SentRequests />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddFriendModal;
