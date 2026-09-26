import mongoose from "mongoose";

const dailyRewardSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    currentDay: {
      type: Number,
      default: 1,
      min: 1,
      max: 7,
    },

    lastClaimedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const DailyReward = mongoose.model(
  "DailyReward",
  dailyRewardSchema
);

export default DailyReward;