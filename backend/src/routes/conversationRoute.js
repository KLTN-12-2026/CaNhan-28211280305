import express from "express";
import {
  createConversation,
  getConversation,
  getMessages,
  MarkAsSeen,
  leaveGroup,
  deleteConversation,
  addMembers,
  removeMember,
  transferOwnership,
} from "../controllers/conversationController.js";
import { checkFriendship } from "../middlewares/friendMiddleware.js";

const router = express.Router();

router.post("/", checkFriendship, createConversation);
router.get("/", getConversation);
router.get("/:conversationId/messages", getMessages);
router.patch("/:conversationId/seen", MarkAsSeen);
router.delete("/:conversationId/leave", leaveGroup);
router.delete("/:conversationId", deleteConversation);

// New group management routes
router.post("/:conversationId/members", addMembers);
router.delete("/:conversationId/members/:memberId", removeMember); // Kick member
router.patch("/:conversationId/ownership", transferOwnership);

export default router;
