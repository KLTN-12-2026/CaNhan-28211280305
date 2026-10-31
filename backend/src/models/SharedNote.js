import mongoose from "mongoose";

const sharedNoteSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      unique: true,
    },
    content: {
      type: String,
      default: "",
      maxlength: 20000,
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

const SharedNote = mongoose.model("SharedNote", sharedNoteSchema);
export default SharedNote;
