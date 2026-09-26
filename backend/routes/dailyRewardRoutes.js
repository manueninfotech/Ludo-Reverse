import express from "express";

import {
  getDailyReward,
  claimReward,
} from "../controllers/dailyRewardController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  requireAuth,
  getDailyReward
);

router.post(
  "/claim",
  requireAuth,
  claimReward
);

export default router;