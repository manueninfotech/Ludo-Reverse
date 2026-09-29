import mongoose from "mongoose";

const userStatsSchema = new mongoose.Schema(
  {
    // User
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // ----------------------------------------------------------
    // PERMANENT PROFILE STATISTICS
    // ----------------------------------------------------------

    // Total games the player has completed
    gamesPlayed: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total games won
    gamesWon: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total games lost
    gamesLost: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Current consecutive winning streak
    currentWinStreak: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total opponent tokens this player has killed
    totalKills: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total times this player's own tokens were captured
    totalTokensCaptured: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total forward moves
    totalForwardMoves: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total backward moves
    totalBackwardMoves: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total dice rolls of six
    totalSixes: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total tokens brought safely into center home
    totalCoinsFinished: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total overall moves
    totalMoves: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Longest win streak ever reached
    longestWinStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: {
      createdAt: false,
      updatedAt: true,
    },
  }
);

const UserStats = mongoose.model(
  "UserStats",
  userStatsSchema
);

export default UserStats;