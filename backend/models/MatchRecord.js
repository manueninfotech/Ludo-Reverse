import mongoose from "mongoose";

const matchRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    result: {
      type: String,
      enum: ["WIN", "LOSS", "DRAW"],
      default: "WIN",
    },
    gameType: {
      type: String,
      default: "Classic Match",
    },
    score: {
      type: String,
      default: "+0 Coins",
    },
    coinsAwarded: {
      type: Number,
      default: 0,
    },
    isWin: {
      type: Boolean,
      default: false,
    },
    roomId: {
      type: String,
      default: null,
    },
    playedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

matchRecordSchema.index({ userId: 1, playedAt: -1 });

const MatchRecord = mongoose.model("MatchRecord", matchRecordSchema);

export default MatchRecord;
