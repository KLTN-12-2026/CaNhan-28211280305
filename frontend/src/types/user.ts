export interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
  isDarkMode?: boolean;
  showOnlineStatus?: boolean;
  role?: "user" | "admin" | "superadmin";
  isBanned?: boolean;
  isOnline?: boolean;
  twoFactorEnabled?: boolean;
  blockedUsers?: string[];
}

export type BlockedUser = Pick<
  User,
  "_id" | "username" | "displayName" | "avatarUrl"
>;

export interface Friend {
  _id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export interface FriendRequest {
  _id: string;
  from?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  to?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  message: string;
  createdAt: string;
  updatedAt: string;
}
