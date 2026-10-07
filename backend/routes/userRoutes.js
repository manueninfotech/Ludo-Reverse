import express from "express";

import {
  getMyProfile,
  updateMyProfile,
  updateMySettings,
  getMyMatchHistory,
  recordUserMatch,
} from "../controllers/userController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/me",
  requireAuth,
  getMyProfile
);

router.patch(
  "/me",
  requireAuth,
  updateMyProfile
);

router.put(
  "/settings",
  requireAuth,
  updateMySettings
);

router.get(
  "/matches",
  requireAuth,
  getMyMatchHistory
);

router.post(
  "/matches",
  requireAuth,
  recordUserMatch
);

export default router;