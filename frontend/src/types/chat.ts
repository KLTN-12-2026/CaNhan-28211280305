export interface Participant {
  _id: string;
  displayName: string;
  avatarUrl?: string | null;
  joinedAt: string;
}

export interface SeenUser {
  _id: string;
  displayName?: string;
  avatarUrl?: string | null;
}

export interface Group {
  name: string;
  createBy: string;
}

export interface LastMessage {
  _id: string;
  content: string;
  imgUrl?: string | null;
  createdAt: string;
  sender: {
    _id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

export interface Conversation {
  _id: string;
  type: "direct" | "group";
  group: Group;
  participants: Participant[];
  isBlocked?: boolean;
  lastMessageAt: string;
  seenBy: SeenUser[];
  lastMessage: LastMessage | null;
  unreadCounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationResponse {
  conversations: Conversation[];
}

export interface CallDetails {
  kind: "audio" | "video";
  status: "completed" | "missed" | "rejected" | "cancelled";
  callerId: string;
  calleeId: string;
  durationSeconds: number;
  endedAt: string;
}

export interface ReplyReference {
  _id: string;
  senderId: {
    _id: string;
    displayName: string;
  } | null;
  content: string | null;
  imgUrl?: string | null;
  callDetails?: CallDetails | null;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  imgUrl?: string | null;
  replyTo?: ReplyReference | null;
  callDetails?: CallDetails | null;
  updatedAt?: string | null;
  createdAt: string;
  isOwn?: boolean;
}
