import User from "../models/User.js";
import { verifyAccessToken } from "../utils/token.js";

export const requireAuth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization header.",
      });
    }

    let payload;

    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired access token.",
      });
    }

    if (payload.type !== "access") {
      return res.status(401).json({
        success: false,
        message: "Invalid access token.",
      });
    }

    const user = await User.findOne({
      userId: payload.userId,
    }).select("-passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "User account is not active.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};