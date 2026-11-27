import { friendService } from "@/services/friendService";
import type { FriendState } from "@/types/store";
import { create } from "zustand";
import { toast } from "sonner";
import axios from "axios";
import { useAuthStore } from "./useAuthStore";

export const useFriendStore = create<FriendState>((set) => ({
  friends: [],
  loading: false,
  receivedList: [],
  sentList: [],
  searchByUsername: async (username) => {
    try {
      set({ loading: true });
      const user = await friendService.searchUserByUsername(username);
      return user;
    } catch (error) {
      console.error("Lỗi khi tìm kiếm user:", error);
      const responseMessage = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(
        responseMessage === "Không thể gửi lời mời kết bạn cho chính mình"
          ? "Bạn không thể kết bạn với chính mình"
          : "Không tìm thấy người dùng hoặc có lỗi xảy ra",
      );
      return null;
    } finally {
      set({ loading: false });
    }
  },
  addFriend: async (to, message) => {
    try {
      const currentUser = useAuthStore.getState().user;
      if (currentUser?._id === to) {
        toast.info("Bạn không thể gửi lời mời kết bạn cho chính mình");
        throw new Error("Không thể gửi lời mời kết bạn cho chính mình");
      }
      set({ loading: true });
      const resultMessage = await friendService.sendFriendRequest(to, message);
      toast.success("Đã gửi lời mời kết bạn");
      return resultMessage;
    } catch (error) {
      console.error("Lỗi khi gửi lời mời kết bạn:", error);
      if (
        error instanceof Error &&
        error.message === "Không thể gửi lời mời kết bạn cho chính mình"
      ) {
        throw error;
      }
      const responseMessage = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;

      if (responseMessage === "Đã là bạn bè") {
        toast.info("Bạn và người này đã là bạn bè");
      } else {
        toast.error("Đã có lỗi xảy ra khi gửi lời mời kết bạn");
      }
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  getAllFriendRequests: async () => {
    try {
      set({ loading: true });
      const result = await friendService.getAllFriendRequests();
      if (!result) return;
      const { sent, received } = result;
      set({ sentList: sent, receivedList: received });
    } catch (error) {
      console.error("Lỗi khi getAllFriendRequests:", error);
      toast.error("Lỗi khi tải danh sách lời mời kết bạn");
    } finally {
      set({ loading: false });
    }
  },
  acceptRequest: async (requestId) => {
    try {
      set({ loading: true });
      await friendService.acceptRequest(requestId);
      set((state) => ({
        receivedList: state.receivedList.filter((r) => r._id !== requestId),
      }));
      toast.success("Đã chấp nhận lời mời kết bạn");
    } catch (error) {
      console.error("Lỗi khi acceptRequest:", error);
      toast.error("Lỗi khi chấp nhận lời mời");
    } finally {
      set({ loading: false });
    }
  },
  declineRequest: async (requestId) => {
    try {
      set({ loading: true });
      await friendService.declineRequest(requestId);
      set((state) => ({
        receivedList: state.receivedList.filter((r) => r._id !== requestId),
      }));
      toast.success("Đã từ chối lời mời kết bạn");
    } catch (error) {
      console.error("Lỗi khi declineRequest:", error);
      toast.error("Lỗi khi từ chối lời mời");
    } finally {
      set({ loading: false });
    }
  },
  getFriends: async () => {
    try {
      set({ loading: true });
      const friends = await friendService.getFriendsList();
      const currentUserId = useAuthStore.getState().user?._id;
      set({
        friends: friends.filter((friend: { _id: string }) =>
          friend._id !== currentUserId
        ),
      });
    } catch (error) {
      console.error("Lỗi khi getFriends:", error);
      toast.error("Lỗi khi tải danh sách bạn bè");
      set({ friends: [] });
    } finally {
      set({ loading: false });
    }
  },
  deleteFriend: async (friendId) => {
    try {
      const currentUserId = useAuthStore.getState().user?._id;
      if (currentUserId === friendId) {
        toast.error("Bạn không thể xóa chính mình khỏi danh sách bạn bè");
        throw new Error("Không thể xóa chính mình");
      }
      set({ loading: true });
      await friendService.deleteFriend(friendId);
      set((state) => ({
        friends: state.friends.filter((f) => f._id !== friendId),
      }));
      toast.success("Đã xóa bạn bè thành công");
    } catch (error) {
      console.error("Lỗi khi xóa bạn:", error);
      toast.error("Lỗi khi xóa bạn bè");
    } finally {
      set({ loading: false });
    }
  },
}));
