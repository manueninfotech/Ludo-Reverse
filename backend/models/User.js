import mongoose from "mongoose";
import crypto from "node:crypto";

const userSchema = new mongoose.Schema(
  {
    userId: {
        type: String,
        unique: true,
        immutable: true,
        default: () => crypto.randomUUID(),
    },

    username: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
    },

    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    passwordHash: {
      type: String,
      default: null,
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    avatar: {
      type: String,
      default: null,
    },

    coins: {
      type: Number,
      default: 1000,
      min: 0,
    },

    status: {
      type: String,
      enum: ["active", "blocked", "deleted"],
      default: "active",
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    settings: {
      sfxEnabled: { type: Boolean, default: true },
      sfxVolume: { type: Number, default: 0.85, min: 0, max: 1 },
      musicEnabled: { type: Boolean, default: true },
      musicVolume: { type: Number, default: 0.70, min: 0, max: 1 },
      hapticFeedback: { type: Boolean, default: true },
      confirmDirection: { type: Boolean, default: true },
      highlightLegalMoves: { type: Boolean, default: true },
      autoSelectSingleMove: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;