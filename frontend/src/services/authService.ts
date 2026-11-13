import api from "@/lib/axios.js";

export const authService = {
  signUp: async (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string
  ) => {
    const res = await api.post(
      "/auth/signup",
      { username, password, email, firstName, lastName },
      { withCredentials: true }
    );
    return res.data;
  },

  signIn: async (username: string, password: string) => {
    const res = await api.post(
      "/auth/signin",
      { username, password },
      { withCredentials: true }
    );
    return res.data;
  },

  signOut: async () => {
    return api.post("/auth/signout", {}, { withCredentials: true });
  },

  fetchMe: async () => {
    const res = await api.get("/users/me", { withCredentials: true });
    return res.data.user;
  },

  refresh: async () => {
    const res = await api.post("/auth/refresh", {}, { withCredentials: true });
    return res.data.accessToken;
  },

  updateProfile: async (data: {
    displayName?: string;
    email?: string;
    phone?: string;
    bio?: string;
  }) => {
    const res = await api.patch("/users/profile", data, {
      withCredentials: true,
    });
    return res.data.user;
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    const res = await api.post(
      "/users/change-password",
      { currentPassword, newPassword, confirmPassword },
      { withCredentials: true }
    );
    return res.data;
  },

  updatePreferences: async (data: {
    isDarkMode?: boolean;
    showOnlineStatus?: boolean;
  }) => {
    const res = await api.patch("/users/preferences", data, {
      withCredentials: true,
    });
    return res.data.preferences;
  },
};
