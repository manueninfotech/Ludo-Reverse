import express from "express";

import {
  getMyProfile,
  updateMyProfile,
  updateMySettings,
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

export default router;