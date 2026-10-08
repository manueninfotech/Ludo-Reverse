import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";

import UserStats from "../../models/UserStats.js";
import { recordGameResult, getUserStats } from "../../services/stats/userStatsService.js";

dotenv.config();

const runTest = async () => {
  const testUserId = `test-user-moves-${Date.now()}`;

  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("MongoDB connected for stats test");

      // 1. Record first game with 15 forward moves and 5 backward moves (win)
      await recordGameResult({
        userId: testUserId,
        result: "won",
        position: 1,
        killsInGame: 2,
        tokensCapturedInGame: 1,
        forwardMovesInGame: 15,
        backwardMovesInGame: 5,
        totalMovesInGame: 20,
      });

      let stats = await getUserStats(testUserId);
      assert.equal(stats.gamesPlayed, 1);
      assert.equal(stats.gamesWon, 1);
      assert.equal(stats.totalForwardMoves, 15);
      assert.equal(stats.totalBackwardMoves, 5);
      assert.equal(stats.totalMoves, 20);
      assert.equal(stats.totalKills, 2);

      // 2. Record second game with 10 forward moves and 12 backward moves (loss)
      await recordGameResult({
        userId: testUserId,
        result: "lost",
        position: 2,
        killsInGame: 1,
        tokensCapturedInGame: 3,
        forwardMovesInGame: 10,
        backwardMovesInGame: 12,
        totalMovesInGame: 22,
      });

      stats = await getUserStats(testUserId);
      assert.equal(stats.gamesPlayed, 2);
      assert.equal(stats.gamesWon, 1);
      assert.equal(stats.gamesLost, 1);
      assert.equal(stats.totalForwardMoves, 25);
      assert.equal(stats.totalBackwardMoves, 17);
      assert.equal(stats.totalMoves, 42);
      assert.equal(stats.totalKills, 3);

      console.log("✓ user stats forward/backward movement tracking test passed!");

      // Cleanup
      await UserStats.deleteOne({ userId: testUserId });
    } else {
      console.log("Skipping DB test: No MONGO_URI in environment.");
    }
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
};

runTest();
