import mongoose from "mongoose";

const sharedBoardSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      unique: true,
    },
    elements: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    version: {
      type: Number,
      default: 0,
      min: 0,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

const SharedBoard = mongoose.model("SharedBoard", sharedBoardSchema);
export default SharedBoard;
