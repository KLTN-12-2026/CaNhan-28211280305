import express from "express";

import {
  sendFriendRequest,
  acceptFriendRequest,
  declinedFriendRequest,
  getAllFriends,
  getFriendRequests,
  deleteFriend,
} from "../controllers/friendController.js";

const router = express.Router();

router.post("/requests", sendFriendRequest);
router.post("/requests/:requestId/accept", acceptFriendRequest);
router.post("/requests/:requestId/decline", declinedFriendRequest);
router.get("/", getAllFriends);
router.get("/requests", getFriendRequests);
router.delete("/:friendId", deleteFriend);

export default router;
