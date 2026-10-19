import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { io } from "../socket/index.js";
import User from "../models/User.js";

const isDirectConversationBlocked = (conversation, currentUser) => {
  if (conversation.type !== "direct") return false;

  const currentUserId = currentUser._id.toString();
  const otherParticipant = conversation.participants.find(
    (participant) =>
      participant.userId?._id.toString() !== currentUserId
  )?.userId;
  if (!otherParticipant) return false;

  return (
    currentUser.blockedUsers.some(
      (id) => id.toString() === otherParticipant._id.toString()
    ) ||
    otherParticipant.blockedUsers.some(
      (id) => id.toString() === currentUserId
    )
  );
};

export const createConversation = async (req, res) => {
  try {
    const { type, name, memberIds } = req.body;
    const userId = req.user._id;
    if (
      !type ||
      (type === "group" && !name) ||
      !memberIds ||
      !Array.isArray(memberIds) ||
      memberIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Tên nhóm và danh sách thành viên là bắt buộc" });
    }
    let conversation;
    if (type === "direct") {
      const participantId = memberIds[0];
      conversation = await Conversation.findOne({
        type: "direct",
        "participants.userId": { $all: [userId, participantId] },
      });
      if (!conversation) {
        conversation = new Conversation({
          type: "direct",
          participants: [{ userId }, { userId: participantId }],
          lastMessageAt: new Date(),
        });
        await conversation.save();
      }
    }
    if (type === "group") {
      conversation = new Conversation({
        type: "group",
        participants: [{ userId }, ...memberIds.map((id) => ({ userId: id }))],
        group: { name, createBy: userId },
        lastMessageAt: new Date(),
      });
      await conversation.save();
    }
    if (!conversation) {
      return res
        .status(400)
        .json({ message: "Conversation type không hợp lệ" });
    }
    await conversation.populate([
      {
        path: "participants.userId",
        select: "displayName avatarUrl blockedUsers",
      },
      { path: "seenBy.userId", select: "displayName avatarUrl" },
      { path: "lastMessage.senderId", select: "displayName avatarUrl" },
    ]);
    const participants = (conversation.participants || []).map((p) => ({
      _id: p.userId?._id,
      displayName: p.userId?.displayName,
      avatarUrl: p.userId?.avatarUrl ?? null,
      joinedAt: p.joinedAt,
    }));

    const isBlocked = isDirectConversationBlocked(conversation, req.user);
    const formatted = { ...conversation.toObject(), participants, isBlocked };
    if (type === "group") {
      // Notify all members including the creator
      [userId, ...memberIds].forEach((uid) => {
        io.to(uid.toString()).emit("new-group", formatted);
      });
    }

    return res.status(201).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi tạo conversation:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({
      "participants.userId": userId,
    })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate({
        path: "participants.userId",
        select: "displayName avatarUrl blockedUsers",
      })
      .populate({
        path: "lastMessage.senderId",
        select: "displayName avatarUrl",
      })
      .populate({
        path: "seenBy.userId",
        select: "displayName avatarUrl",
      });
    const formated = conversations.map((convo) => {
      const participants = (convo.participants || []).map((p) => ({
        _id: p.userId?._id,
        displayName: p.userId?.displayName,
        avatarUrl: p.userId?.avatarUrl ?? null,
        joinedAt: p.joinedAt,
      }));
      const isBlocked = isDirectConversationBlocked(convo, req.user);

      return {
        ...convo.toObject(),
        unreadCounts: convo.unreadCounts || {},
        participants,
        isBlocked,
      };
    });
    return res.status(200).json({ conversations: formated });
  } catch (error) {
    console.error("Lỗi khi lấy conversations:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, cusror } = req.query;
    const query = { conversationId };
    if (cusror) {
      query.createdAt = { $lt: new Date(cusror) };
    }
    let messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit) + 1);
    let nextCursor = null;
    if (messages.length > Number(limit)) {
      const nextMessage = messages[messages.length - 1];
      nextCursor = nextMessage.createdAt.toISOString();
      messages.pop();
    }
    messages.reverse();
    return res.status(200).json({ messages, nextCursor });
  } catch (error) {
    console.error("Lỗi khi lấy messages:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getUserConversationsForSocketIO = async (userId) => {
  try {
    const conversations = await Conversation.find(
      { "participants.userId": userId },
      { _id: 1 }
    );
    return conversations.map((c) => c._id.toString());
  } catch (error) {
    console.error("Lỗi khi fetch conversations:", error);
    return [];
  }
};

export const MarkAsSeen = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      return res.status(404).json({ message: "Cuộc trò chuyện không tồn tại" });
    }
    const last = conversation.lastMessage;
    if (!last) {
      return res
        .status(200)
        .json({ message: "Không có tin nhắn nào để đánh dấu đã xem" });
    }
    if (last.senderId.toString() === userId) {
      return res.status(200).json({
        message: "Người gửi không thể đánh dấu tin nhắn của chính họ đã xem",
      });
    }
    const updated = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $addToSet: { seenBy: userId },
        $set: { [`unreadCounts.${userId}`]: 0 },
      },
      {
        new: true,
      }
    );
    io.to(conversationId).emit("read-message", {
      conversation: updated,
      lastMessage: {
        _id: updated?.lastMessage._id,
        content: updated?.lastMessage.content,
        createdAt: updated?.lastMessage.createdAt,
        sender: {
          _id: updated?.lastMessage.senderId,
        },
      },
    });
    return res.status(200).json({
      message: "Đã đánh dấu tin nhắn đã xem",
      seenBy: updated?.seenBy || [],
      myUnreadCount: updated?.unreadCounts[userId] || 0,
    });
  } catch (error) {
    console.error("Lỗi khi đánh dấu tin nhắn đã xem:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Nhóm không tồn tại" });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Chỉ có thể rời khỏi nhóm chat" });
    }
    
    // If owner leaves, must transfer ownership first (or simply delete the group if they are the only one, handled below)
    if (conversation.group.createBy.toString() === userId && conversation.participants.length > 1) {
       return res.status(400).json({message: "Trưởng nhóm phải chuyển giao quyền trước khi rời nhóm."});
    }

    // Kiểm tra user có phải thành viên không
    const isMember = conversation.participants.some(
      (p) => p.userId.toString() === userId
    );
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "Bạn không phải thành viên của nhóm này" });
    }

    // Xóa user khỏi participants
    conversation.participants = conversation.participants.filter(
      (p) => p.userId.toString() !== userId
    );

    // Xóa unreadCount của user
    conversation.unreadCounts.delete(userId);

    await conversation.save();
    
    // If no participants left, delete conversation
    if (conversation.participants.length === 0) {
        await Conversation.findByIdAndDelete(conversationId);
    } else {
        // Emit event for remaining members
        io.to(conversationId).emit("member-left", {
          conversationId,
          userId,
          participants: conversation.participants,
        });
    }

    return res.status(200).json({
      message: "Bạn đã rời khỏi nhóm",
      conversation,
    });
  } catch (error) {
    console.error("Lỗi khi rời nhóm:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Cuộc trò chuyện không tồn tại" });
    }

    if (conversation.type === 'group') {
        const isOwner = conversation.group.createBy.toString() === userId;
        if (!isOwner) {
             return res.status(403).json({ message: "Chỉ trưởng nhóm mới có quyền xóa nhóm" });
        }
    } else {
         // Direct message logic remains - check membership
        const isMember = conversation.participants.some(
          (p) => p.userId.toString() === userId
        );
        if (!isMember) {
          return res
            .status(403)
            .json({ message: "Bạn không phải thành viên của cuộc trò chuyện này" });
        }
    }

    await Conversation.findByIdAndDelete(conversationId);

    io.to(conversationId).emit("conversation-deleted", {
      conversationId,
      deletedBy: userId,
    });

    return res.status(200).json({
      message: "Đã xóa cuộc trò chuyện",
      conversationId,
    });
  } catch (error) {
    console.error("Lỗi khi xóa cuộc trò chuyện:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const addMembers = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { newMemberIds } = req.body; // Array of user IDs
        const userId = req.user._id.toString();

        if (!newMemberIds || !Array.isArray(newMemberIds) || newMemberIds.length === 0) {
            return res.status(400).json({ message: "Danh sách thành viên không hợp lệ" });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Cuộc trò chuyện không tồn tại" });
        }

        if (conversation.type !== 'group') {
             return res.status(400).json({ message: "Không thể thêm thành viên vào cuộc trò chuyện trực tiếp" });
        }
        
        // Members and Owners can add members
        const isMember = conversation.participants.some(p => p.userId.toString() === userId);
        if (!isMember) {
             return res.status(403).json({ message: "Chỉ thành viên mới có quyền thêm thành viên" });
        }

        // Filter out existing members
        const existingMemberIds = conversation.participants.map(p => p.userId.toString());
        const toAdd = newMemberIds.filter(id => !existingMemberIds.includes(id));

        if (toAdd.length === 0) {
             return res.status(400).json({ message: "Tất cả các thành viên đã tồn tại trong nhóm" });
        }

        conversation.participants.push(...toAdd.map(id => ({ userId: id })));
        await conversation.save();
        
        // Populate new members for response
        await conversation.populate({
            path: 'participants.userId',
            select: 'displayName avatarUrl'
        });

        const participants = (conversation.participants || []).map((p) => ({
            _id: p.userId?._id,
            displayName: p.userId?.displayName,
            avatarUrl: p.userId?.avatarUrl ?? null,
            joinedAt: p.joinedAt,
        }));
        
        // Notify the group (including new members)
        const formatted = { ...conversation.toObject(), participants };
        io.to(conversationId).emit("members-added", {
           conversationId,
           conversation: formatted,
           addedBy: userId
        });
        
        // Also notify new members specifically so they see the group in their list
        toAdd.forEach(id => {
            io.to(id).emit("new-group", formatted);
        });

        res.status(200).json({ conversation: formatted });

    } catch (error) {
         console.error("Error adding members:", error);
         res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const removeMember = async (req, res) => {
    try {
        const { conversationId, memberId } = req.params;
        const userId = req.user._id.toString();

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
             return res.status(404).json({ message: "Cuộc trò chuyện không tồn tại" });
        }

        if (conversation.type !== 'group') {
              return res.status(400).json({ message: "Không phải nhóm chat" });
        }

        const isOwner = conversation.group.createBy.toString() === userId;
        if (!isOwner) {
             return res.status(403).json({ message: "Chỉ trưởng nhóm mới có quyền xóa thành viên" });
        }
        
        if (memberId === userId) {
            return res.status(400).json({ message: "Không thể kick chính mình. Sử dụng rời nhóm thay"});
        }

        conversation.participants = conversation.participants.filter(p => p.userId.toString() !== memberId);
        conversation.unreadCounts.delete(memberId);
        
        await conversation.save();

        io.to(conversationId).emit("member-removed", {
            conversationId,
            removedUserId: memberId
        });
        
        // Notify removed user
        io.to(memberId).emit("conversation-removed", { conversationId });

        res.status(200).json({ message: "Thành viên đã được kick khỏi nhóm" });
    } catch (error) {
        console.error("Error removing member:", error);
        res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const transferOwnership = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { newOwnerId } = req.body;
        const userId = req.user._id.toString();

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
             return res.status(404).json({ message: "Conversation not found" });
        }
        
        if (conversation.type !== 'group') {
              return res.status(400).json({ message: "Not a group chat" });
        }

        const isOwner = conversation.group.createBy.toString() === userId;
        if (!isOwner) {
             return res.status(403).json({ message: "Only group leader can transfer ownership" });
        }

        const isMember = conversation.participants.some(p => p.userId.toString() === newOwnerId);
        if (!isMember) {
             return res.status(400).json({ message: "New leader must be a member of the group" });
        }

        conversation.group.createBy = newOwnerId;
        await conversation.save();

        io.to(conversationId).emit("ownership-transferred", {
            conversationId,
            newOwnerId
        });

        res.status(200).json({ message: "Ownership transferred successfully" });

    } catch (error) {
        console.error("Error transferring ownership:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
