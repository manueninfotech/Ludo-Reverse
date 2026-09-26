import { verifyAccessToken } from "../utils/token.js";

export const socketAuthMiddleware = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required."));
    }

    const payload = verifyAccessToken(token);

    if (payload.type !== "access") {
      return next(new Error("Invalid access token."));
    }

    socket.data.userId = payload.userId;

    next();
  } catch (error) {
    console.error(
      "Socket authentication error:",
      error.message
    );

    next(new Error("Invalid or expired access token."));
  }
};