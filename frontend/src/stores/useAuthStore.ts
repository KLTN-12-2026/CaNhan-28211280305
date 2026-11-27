import { create } from "zustand";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import type { AuthState } from "@/types/store";
import { persist } from "zustand/middleware";
import { useChatStore } from "./useChatStore";
import axios from "axios";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      loading: false,

      setAccessToken: (accessToken) => {
        set({ accessToken });
      },
      setUser: (user) => {
        set({ user });
      },

      clearState: () => {
        set({ accessToken: null, user: null, loading: false });
        useChatStore.getState().reset();
        localStorage.clear();
        sessionStorage.clear();
      },

      signUp: async (username, password, email, firstName, lastName) => {
        try {
          set({ loading: true });

          await authService.signUp(
            username,
            password,
            email,
            firstName,
            lastName
          );

          toast.success("Đăng ký thành công");
        } catch (error) {
          console.error(error);
          toast.error("Đăng ký không thành công");
        } finally {
          set({ loading: false });
        }
      },

      signIn: async (username, password) => {
        try {
          get().clearState();
          set({ loading: true });

          const result = await authService.signIn(username, password);
          if ("requiresTwoFactor" in result) {
            return result;
          }
          const { accessToken } = result;
          get().setAccessToken(accessToken);
          await get().fetchMe();
          if (!get().accessToken) {
            return false;
          }
          useChatStore.getState().fetchConversations();
          toast.success("Chào mừng bạn quay lại");
          return true;
        } catch (error) {
          console.error(error);
          if (
            axios.isAxiosError<{ message?: string }>(error) &&
            error.response?.status === 403
          ) {
            toast.error(
              error.response.data?.message ||
                "Tài khoản của bạn đã bị khóa. Vui lòng kiểm tra lại."
            );
          } else {
            toast.error("Đăng nhập không thành công");
          }
          return false;
        } finally {
          set({ loading: false });
        }
      },

      signOut: async () => {
        try {
          get().clearState();
          await authService.signOut();
          toast.success("Logout thành công");
        } catch (error) {
          console.error(error);
          toast.error("Lỗi xãy ra khi logout. Hãy thử lại");
        }
      },

      fetchMe: async () => {
        try {
          set({ loading: true });
          const user = await authService.fetchMe();
          set({ user });
        } catch (error) {
          console.error(error);
          set({ user: null, accessToken: null });
          toast.error("Lỗi xãy ra khi lấy dữ liệu người dùng. Hãy thử lại");
        } finally {
          set({ loading: false });
        }
      },

      refresh: async () => {
        try {
          set({ loading: true });
          const { fetchMe, setAccessToken } = get();
          const accessToken = await authService.refresh();
          setAccessToken(accessToken);
          await fetchMe();
        } catch (error) {
          console.error(error);
          toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại");
          get().clearState();
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
