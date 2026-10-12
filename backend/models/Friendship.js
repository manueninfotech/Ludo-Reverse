import mongoose from "mongoose";

const friendshipSchema = new mongoose.Schema(
  {
    requesterId: {
      type: String,
      required: true,
      index: true,
    },
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "blocked"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate friendships between two users
friendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

const Friendship = mongoose.model("Friendship", friendshipSchema);

export default Friendship;
