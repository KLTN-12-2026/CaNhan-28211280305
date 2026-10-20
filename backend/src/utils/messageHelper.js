export const updateConversationAfterCreateMessage = (
  conversation,
  message,
  senderId,
) => {
  conversation.set({
    seenBy: [],
    lastMessageAt: message.createdAt,
    lastMessage: {
      _id: message._id,
      content: message.content,
      imgUrl: message.imgUrl,
      senderId,
      createdAt: message.createdAt,
    },
  });
  conversation.participants.forEach((p) => {
    const memberId = p.userId.toString();
    const isSender = memberId === senderId.toString();
    const prevCount = conversation.unreadCounts.get(memberId) || 0;
    conversation.unreadCounts.set(memberId, isSender ? 0 : prevCount + 1);
  });
};

export const emitNewMessage = (io, conversation, message) => {
  const payload = {
    message: {
      ...message.toObject(),
    },
    conversation: {
      _id: conversation._id,
      lastMessage: {
        ...conversation.lastMessage,
        imgUrl: message.imgUrl,
      },
      lastMessageAt: conversation.lastMessageAt,
    },
    unreadCounts: Object.fromEntries(
      conversation.unreadCounts?.entries?.() ?? [],
    ),
  };

  const participantIds = (conversation.participants || []).map(
    (p) => p.userId?.toString?.() ?? p.userId,
  );

  participantIds.forEach((userId) => {
    if (userId) {
      io.to(userId.toString()).emit("new-message", payload);
    }
  });
};
