import api from "@/lib/axios";
import type { BlockedUser } from "@/types/user";

export const userService = {
  getBlockedUsers: async (): Promise<BlockedUser[]> => {
    const res = await api.get("/users/blocked");
    return res.data.blockedUsers;
  },
  blockUser: async (userId: string) => {
    const res = await api.post(`/users/${userId}/block`);
    return res.data as { blockedUsers: string[]; isBlocked: boolean };
  },
  unblockUser: async (userId: string) => {
    const res = await api.delete(`/users/${userId}/block`);
    return res.data as { blockedUsers: string[]; isBlocked: boolean };
  },
  uploadAvatar: async (formData: FormData) => {
    const res = await api.post("/users/uploadAvatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (res.status === 400) {
      throw new Error(res.data.message);
    }
    return res.data;
  },
};
