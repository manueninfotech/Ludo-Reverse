import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
} from "../controllers/friendController.js";

const router = express.Router();

// All friends endpoints require authentication
router.use(requireAuth);

router.get("/", getFriends);
router.get("/search", searchUsers);
router.post("/request", sendFriendRequest);
router.post("/accept/:friendshipId", acceptFriendRequest);
router.post("/reject/:friendshipId", rejectFriendRequest);
router.delete("/:friendshipId", removeFriend);

export default router;
