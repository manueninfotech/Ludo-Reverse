import express from "express";

import {
  getMyProfile,
  updateMyProfile,
  updateMySettings,
  getMyMatchHistory,
  recordUserMatch,
  deleteMyAccount,
} from "../controllers/userController.js";

import {
  verifyEmail,
  sendEmailVerification,
} from "../controllers/authController.js";

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

router.delete(
  "/me",
  requireAuth,
  deleteMyAccount
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

router.post(
  "/verify-email",
  requireAuth,
  verifyEmail
);

router.post(
  "/resend-verification",
  requireAuth,
  sendEmailVerification
);

export default router;