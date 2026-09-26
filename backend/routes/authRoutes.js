import express from "express";
import {
  signup,
  login,
  refreshToken,
  logout,
  googleLogin,
} from "../controllers/authController.js";


const router = express.Router();

router.post(
  "/signup",
  signup
);

router.post(
  "/login",
  login
);

router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.post("/google", googleLogin);

export default router;