import "dotenv/config";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET;

const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET;

const ACCESS_EXPIRES_IN =
  process.env.JWT_ACCESS_EXPIRES_IN || "15m";

const REFRESH_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || "7d";

if (!ACCESS_SECRET) {
  throw new Error(
    "JWT_ACCESS_SECRET is missing."
  );
}

if (!REFRESH_SECRET) {
  throw new Error(
    "JWT_REFRESH_SECRET is missing."
  );
}

export const generateAccessToken = ({ userId }) =>
  jwt.sign(
    {
      userId,
      type: "access",
      jti: crypto.randomUUID(),
    },
    ACCESS_SECRET,
    {
      expiresIn: ACCESS_EXPIRES_IN,
    }
  );

export const generateRefreshToken = ({ userId }) =>
  jwt.sign(
    {
      userId,
      type: "refresh",
      jti: crypto.randomUUID(),
    },
    REFRESH_SECRET,
    {
      expiresIn: REFRESH_EXPIRES_IN,
    }
  );

export const verifyAccessToken = (token) =>
  jwt.verify(token, ACCESS_SECRET);

export const verifyRefreshToken = (token) =>
  jwt.verify(token, REFRESH_SECRET);