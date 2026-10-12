import User from "../models/User.js";
import { OAuth2Client } from "google-auth-library";

import {
  hashPassword,
  comparePassword,
  hashRefreshToken,
} from "../utils/password.js";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token.js";

import RefreshToken from "../models/RefreshToken.js";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

export const signup = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      displayName,
    } = req.body;

    // -----------------------------
    // Validation
    // -----------------------------

    if (
      !username ||
      !email ||
      !password ||
      !displayName
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Username, email, password and display name are required.",
      });
    }

    const normalizedUsername =
      username.trim().toLowerCase();

    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedDisplayName =
      displayName.trim();

    if (normalizedUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message:
          "Username must be at least 3 characters.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters.",
      });
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one letter and one number.",
      });
    }

    // -----------------------------
    // Check existing user
    // -----------------------------

    const existingUser = await User.findOne({
      $or: [
        { username: normalizedUsername },
        { email: normalizedEmail },
      ],
    });

    if (existingUser) {
      if (
        existingUser.username ===
        normalizedUsername
      ) {
        return res.status(409).json({
          success: false,
          message: "Username already exists.",
        });
      }

      if (
        existingUser.email ===
        normalizedEmail
      ) {
        return res.status(409).json({
          success: false,
          message: "Email already exists.",
        });
      }
    }

    // -----------------------------
    // Hash password
    // -----------------------------

    const passwordHash =
      await hashPassword(password);

    // -----------------------------
    // Create user
    // -----------------------------

    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      displayName:
        normalizedDisplayName,
    });

    // -----------------------------
    // Generate auth tokens
    // -----------------------------

    const accessToken = generateAccessToken({
      userId: user.userId,
    });

    const refreshToken = generateRefreshToken({
      userId: user.userId,
    });

    const refreshTokenHash = hashRefreshToken(refreshToken);

    const refreshTokenPayload = JSON.parse(
      Buffer.from(refreshToken.split(".")[1], "base64").toString("utf8")
    );

    await RefreshToken.findOneAndUpdate(
      { tokenHash: refreshTokenHash },
      {
        userId: user.userId,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(refreshTokenPayload.exp * 1000),
        revokedAt: null,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    // -----------------------------
    // Safe response with tokens
    // -----------------------------

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      accessToken,
      refreshToken,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        isEmailVerified:
          user.isEmailVerified,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "Signup error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create account.",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // -----------------------------
    // Validation
    // -----------------------------

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Username/email and password are required.",
      });
    }

    const normalizedIdentifier =
      identifier.trim().toLowerCase();

    // -----------------------------
    // Find user
    // -----------------------------

    const user = await User.findOne({
      $or: [
        {
          username: normalizedIdentifier,
        },
        {
          email: normalizedIdentifier,
        },
      ],
    }).select("+passwordHash");

    // Use the same message for both
    // cases so we don't reveal whether
    // an account exists.
    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid username/email or password.",
      });
    }

    // -----------------------------
    // Check account status
    // -----------------------------

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message:
          "This account is not active.",
      });
    }

    // -----------------------------
    // Verify password
    // -----------------------------

    const passwordMatches =
      await comparePassword(
        password,
        user.passwordHash
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid username/email or password.",
      });
    }

    // -----------------------------
    // Update last login
    // -----------------------------

    user.lastLoginAt = new Date();

    await user.save();

    // -----------------------------
    // Generate tokens
    // -----------------------------

    const accessToken =
    generateAccessToken({
        userId: user.userId,
    });

    const refreshToken =
    generateRefreshToken({
        userId: user.userId,
    });

    // -----------------------------
    // Store refresh token hash
    // -----------------------------

    const refreshTokenHash =
    hashRefreshToken(refreshToken);

    const refreshTokenPayload =
    JSON.parse(
        Buffer.from(
        refreshToken.split(".")[1],
        "base64"
        ).toString("utf8")
    );

    await RefreshToken.findOneAndUpdate(
      { tokenHash: refreshTokenHash },
      {
        userId: user.userId,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(
          refreshTokenPayload.exp * 1000
        ),
        revokedAt: null,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    // -----------------------------
    // Return authentication data
    // -----------------------------

    return res.status(200).json({
    success: true,
    message: "Login successful.",

    accessToken,

    refreshToken,

    user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        isEmailVerified:
        user.isEmailVerified,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
    },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to login.",
    });
  }
};
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
    }

    let payload;

    try {
      payload = verifyRefreshToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token.",
      });
    }

    if (payload.type !== "refresh") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    const tokenHash = hashRefreshToken(token);

    const storedToken = await RefreshToken.findOne({
      tokenHash,
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is not recognized.",
      });
    }

    if (storedToken.revokedAt) {
      return res.status(401).json({
        success: false,
        message: "Refresh token has been revoked.",
      });
    }

    if (storedToken.expiresAt <= new Date()) {
      return res.status(401).json({
        success: false,
        message: "Refresh token has expired.",
      });
    }

    const user = await User.findOne({
      userId: payload.userId,
    });

    if (!user || user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "User is not active.",
      });
    }

    // Revoke old refresh token
    storedToken.revokedAt = new Date();
    await storedToken.save();

    // Generate new token pair
    const newAccessToken = generateAccessToken({
      userId: user.userId,
    });

    const newRefreshToken = generateRefreshToken({
      userId: user.userId,
    });

    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

    const newRefreshTokenPayload = JSON.parse(
      Buffer.from(
        newRefreshToken.split(".")[1],
        "base64"
      ).toString("utf8")
    );

    await RefreshToken.findOneAndUpdate(
      { tokenHash: newRefreshTokenHash },
      {
        userId: user.userId,
        tokenHash: newRefreshTokenHash,
        expiresAt: new Date(newRefreshTokenPayload.exp * 1000),
        revokedAt: null,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
export const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
    }

    const tokenHash = hashRefreshToken(token);

    const storedToken = await RefreshToken.findOne({
      tokenHash,
    });

    if (!storedToken) {
      return res.status(200).json({
        success: true,
        message: "Logout successful.",
      });
    }

    if (!storedToken.revokedAt) {
      storedToken.revokedAt = new Date();
      await storedToken.save();
    }

    return res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { idToken, accessToken: googleAccessToken } = req.body;

    if (!idToken && !googleAccessToken) {
      return res.status(400).json({
        success: false,
        message: "Google ID token or access token is required.",
      });
    }

    let payload;

    const envAudiences = process.env.GOOGLE_CLIENT_IDS
      ? process.env.GOOGLE_CLIENT_IDS.split(",").map((id) => id.trim())
      : [];

    const validAudiences = [
      process.env.GOOGLE_CLIENT_ID,
      ...envAudiences,
    ].filter(Boolean);

    if (idToken) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: validAudiences,
        });

        payload = ticket.getPayload();
      } catch (error) {
        console.error("Google verifyIdToken error:", error.message);
      }
    }

    // Fallback: If idToken verification failed or mobile sent accessToken
    if (!payload && googleAccessToken) {
      try {
        const userInfoRes = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${googleAccessToken}` },
          }
        );
        if (userInfoRes.ok) {
          payload = await userInfoRes.json();
        } else {
          console.error("Google userinfo HTTP status:", userInfoRes.status);
        }
      } catch (err) {
        console.error("Google userinfo fetch error:", err.message);
      }
    }

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google ID token.",
      });
    }

    if (!payload?.sub || !payload?.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google account information.",
      });
    }

    if (payload.email_verified !== true) {
      return res.status(401).json({
        success: false,
        message: "Google email is not verified.",
      });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();

    let user = await User.findOne({
      googleId,
    });

    // Existing Google account
    if (user) {
      if (user.status !== "active") {
        return res.status(403).json({
          success: false,
          message: "User account is not active.",
        });
      }
    } else {
      // Check whether this email already exists
      user = await User.findOne({
        email,
      });

      // Link Google to an existing email/password account
      if (user) {
        if (user.status !== "active") {
          return res.status(403).json({
            success: false,
            message: "User account is not active.",
          });
        }

        if (user.googleId && user.googleId !== googleId) {
          return res.status(409).json({
            success: false,
            message: "This email is linked to another Google account.",
          });
        }

        user.googleId = googleId;

        if (!user.avatar && payload.picture) {
          user.avatar = payload.picture;
        }

        if (!user.displayName && payload.name) {
          user.displayName = payload.name;
        }

        await user.save();
      } else {
        // Create new Google account
        const baseUsername =
          email
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "")
            .slice(0, 24) || "player";

        let username = baseUsername;
        let usernameExists = await User.findOne({ username });

        while (usernameExists) {
          const randomSuffix = Math.floor(
            1000 + Math.random() * 9000
          );

          username = `${baseUsername.slice(0, 20)}${randomSuffix}`;

          usernameExists = await User.findOne({
            username,
          });
        }

        user = await User.create({
          username,
          email,
          googleId,
          passwordHash: null,
          displayName: payload.name || username,
          avatar: payload.picture || null,
        });
      }
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = generateAccessToken({
      userId: user.userId,
    });

    const refreshToken = generateRefreshToken({
      userId: user.userId,
    });

    const refreshTokenHash = hashRefreshToken(refreshToken);

    const refreshTokenPayload = JSON.parse(
      Buffer.from(
        refreshToken.split(".")[1],
        "base64"
      ).toString("utf8")
    );

    await RefreshToken.findOneAndUpdate(
      { tokenHash: refreshTokenHash },
      {
        userId: user.userId,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(refreshTokenPayload.exp * 1000),
        revokedAt: null,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Google authentication successful.",
      accessToken,
      refreshToken,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        coins: user.coins,
        isEmailVerified: user.isEmailVerified,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("Google authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ============================================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// ============================================================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ success: false, message: "Valid email is required." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail, status: { $ne: "deleted" } });
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email." });
    }

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = resetOtp;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    console.log(`[PASSWORD RESET] Code for ${cleanEmail}: ${resetOtp}`);

    return res.status(200).json({
      success: true,
      message: "Password reset code sent successfully.",
      resetCode: resetOtp,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ success: false, message: "Unable to process password reset." });
  }
};

// ============================================================
// RESET PASSWORD
// POST /api/auth/reset-password
// ============================================================
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, reset code, and new password are required." });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail, status: { $ne: "deleted" } })
      .select("+resetPasswordOtp +resetPasswordExpires");

    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email." });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.toString().trim()) {
      return res.status(400).json({ success: false, message: "Invalid reset code." });
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ success: false, message: "Reset code has expired. Please request a new one." });
    }

    const hashedPassword = await hashPassword(newPassword);
    user.passwordHash = hashedPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Revoke previous refresh tokens
    await RefreshToken.deleteMany({ userId: user.userId });

    return res.status(200).json({
      success: true,
      message: "Password has been successfully updated! You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ success: false, message: "Failed to reset password." });
  }
};

// ============================================================
// SEND EMAIL VERIFICATION CODE
// POST /api/users/resend-verification
// ============================================================
export const sendEmailVerification = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationCode = code;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    console.log(`[EMAIL VERIFY] Code for ${user.email}: ${code}`);

    return res.status(200).json({
      success: true,
      message: "Verification code sent successfully.",
      verificationCode: code,
    });
  } catch (error) {
    console.error("Send verification error:", error);
    return res.status(500).json({ success: false, message: "Failed to send verification code." });
  }
};

// ============================================================
// VERIFY EMAIL
// POST /api/users/verify-email
// ============================================================
export const verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId })
      .select("+emailVerificationCode +emailVerificationExpires");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const { code } = req.body;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ success: false, message: "Verification code is required." });
    }

    if (!user.emailVerificationCode || user.emailVerificationCode !== code.trim()) {
      return res.status(400).json({ success: false, message: "Invalid verification code." });
    }

    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ success: false, message: "Verification code has expired." });
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email successfully verified!",
      isEmailVerified: true,
    });
  } catch (error) {
    console.error("Verify email error:", error);
    return res.status(500).json({ success: false, message: "Verification failed." });
  }
};