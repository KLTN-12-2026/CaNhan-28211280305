import api from "@/lib/axios";
import type { ConversationResponse, Message } from "@/types/chat";

interface FetchMessageProps {
  messages: Message[];
  cursor?: string;
}

export interface SharedNote {
  conversationId: string;
  content: string;
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface BoardPoint {
  x: number;
  y: number;
}

export interface WhiteboardStroke {
  id: string;
  type: "stroke";
  color: string;
  width: number;
  points: BoardPoint[];
}

export interface WhiteboardNote {
  id: string;
  type: "note";
  text: string;
  x: number;
  y: number;
}

export type WhiteboardElement = WhiteboardStroke | WhiteboardNote;

export interface SharedBoard {
  conversationId: string;
  elements: WhiteboardElement[];
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

const pageLimit = 50;

export const chatService = {
  async fetchConversations(): Promise<ConversationResponse> {
    const res = await api.get("/conversations");
    return res.data;
  },
  async fetchMessages(id: string, cursor?: string): Promise<FetchMessageProps> {
    const res = await api.get(
      `/conversations/${id}/messages?limit=${pageLimit}&cursor=${cursor}`
    );
    return { messages: res.data.messages, cursor: res.data.nextCursor };
  },
  async fetchSharedNote(conversationId: string): Promise<SharedNote> {
    const res = await api.get(`/conversations/${conversationId}/shared-notes`);
    return { conversationId, ...res.data.note };
  },
  async updateSharedNote(
    conversationId: string,
    content: string,
    version: number,
  ): Promise<SharedNote> {
    const res = await api.put(
      `/conversations/${conversationId}/shared-notes`,
      { content, version },
    );
    return res.data.note;
  },
  async fetchWhiteboard(conversationId: string): Promise<SharedBoard> {
    const res = await api.get(`/conversations/${conversationId}/whiteboard`);
    return { conversationId, ...res.data.board };
  },
  async updateWhiteboard(
    conversationId: string,
    elements: WhiteboardElement[],
    version: number,
  ): Promise<SharedBoard> {
    const res = await api.put(`/conversations/${conversationId}/whiteboard`, {
      elements,
      version,
    });
    return res.data.board;
  },
  async sendDirectMessage(
    recipientId: string,
    content: string = "",
    imgUrl?: string,
    conversationId?: string,
    replyToId?: string,
  ) {
    const res = await api.post("/messages/direct", {
      recipientId,
      content,
      imgUrl,
      conversationId,
      replyToId,
    });
    return res.data.message;
  },
  async sendGroupMessage(
    conversationId: string,
    content: string = "",
    imgUrl?: string,
    replyToId?: string,
  ) {
    const res = await api.post("/messages/group", {
      conversationId,
      content,
      imgUrl,
      replyToId,
    });
    return res.data.message;
  },
  async markAsSeen(conversationId: string) {
    const res = await api.patch(`/conversations/${conversationId}/seen`);
    return res.data;
  },
  async createConversation(
    type: "direct" | "group",
    name: string,
    memberIds: string[]
  ) {
    const res = await api.post("/conversations", { type, name, memberIds });
    return res.data.conversation;
  },
  async leaveGroup(conversationId: string) {
    const res = await api.delete(`/conversations/${conversationId}/leave`);
    return res.data;
  },
  async deleteConversation(conversationId: string) {
    const res = await api.delete(`/conversations/${conversationId}`);
    return res.data;
  },
  async addMembers(conversationId: string, newMemberIds: string[]) {
    const res = await api.post(`/conversations/${conversationId}/members`, {
      newMemberIds,
    });
    return res.data;
  },
  async removeMember(conversationId: string, memberId: string) {
    const res = await api.delete(
      `/conversations/${conversationId}/members/${memberId}`
    );
    return res.data;
  },
  async transferOwnership(conversationId: string, newOwnerId: string) {
    const res = await api.patch(`/conversations/${conversationId}/ownership`, {
      newOwnerId,
    });
    return res.data;
  },
  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append("image", file);
    const res = await api.post("/messages/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data.imgUrl;
  },
};
