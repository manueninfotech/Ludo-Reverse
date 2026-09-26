import mongoose from "mongoose";

const refreshTokenSchema =
  new mongoose.Schema(
    {
      userId: {
        type: String,
        required: true,
        index: true,
      },

      tokenHash: {
        type: String,
        required: true,
        unique: true,
      },

      expiresAt: {
        type: Date,
        required: true,
      },

      revokedAt: {
        type: Date,
        default: null,
      },

      createdAt: {
        type: Date,
        default: Date.now,
      },
    }
  );

const RefreshToken =
  mongoose.model(
    "RefreshToken",
    refreshTokenSchema
  );

export default RefreshToken;