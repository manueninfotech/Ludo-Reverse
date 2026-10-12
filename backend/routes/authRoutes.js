import express from "express";
import rateLimit from "express-rate-limit";
import {
  signup,
  login,
  refreshToken,
  logout,
  googleLogin,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

// Strict limiter for Login: max 5 failed/repeated attempts per 15 mins per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

// Strict limiter for Registration: max 5 accounts per 15 mins per IP
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many account registration attempts. Please try again after 15 minutes.",
  },
});

// Limiter for Password Reset: max 5 requests per 15 mins
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again after 15 minutes.",
  },
});

router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.post("/google", googleLogin);
router.post("/forgot-password", resetLimiter, forgotPassword);
router.post("/reset-password", resetLimiter, resetPassword);

export default router;