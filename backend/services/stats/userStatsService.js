import UserStats from "../../models/UserStats.js";

import {
  getCoinRewardForPosition,
  addCoins,
} from "../coins/coinService.js";

// ============================================================
// GET OR CREATE USER STATS
// ============================================================

export const getOrCreateUserStats = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const stats = await UserStats.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    }
  );

  return stats;
};

// ============================================================
// GET USER STATS
// ============================================================

export const getUserStats = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  return await getOrCreateUserStats(userId);
};

// ============================================================
// RECORD FINAL GAME RESULT
// ============================================================
//
// IMPORTANT:
//
// Nothing is written to UserStats during the game.
//
// This function is called ONLY when the game finishes.
//
// Permanent statistics:
//
// gamesPlayed
// gamesWon
// gamesLost
// currentWinStreak
// totalKills
// totalTokensCaptured
//
// ============================================================

export const recordGameResult = async ({
  userId,
  result,
  position,
  killsInGame = 0,
  tokensCapturedInGame = 0,
}) => {
  if (!userId) return;

  const safeKills =
    Number.isInteger(killsInGame) && killsInGame > 0
      ? killsInGame
      : 0;

  const safeTokensCaptured =
    Number.isInteger(tokensCapturedInGame) &&
    tokensCapturedInGame > 0
      ? tokensCapturedInGame
      : 0;

  // --------------------------------------------------------
  // 1ST PLACE
  // --------------------------------------------------------

  if (result === "won" && position === 1) {
    await UserStats.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: { userId },

        $inc: {
          gamesPlayed: 1,
          gamesWon: 1,
          currentWinStreak: 1,
          totalKills: safeKills,
          totalTokensCaptured: safeTokensCaptured,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );

    return;
  }

  // --------------------------------------------------------
  // OTHER WINNING POSITIONS
  // --------------------------------------------------------

  if (result === "won") {
    await UserStats.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: { userId },

        $inc: {
          gamesPlayed: 1,
          gamesWon: 1,
          totalKills: safeKills,
          totalTokensCaptured: safeTokensCaptured,
        },

        $set: {
          currentWinStreak: 0,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );

    return;
  }

  // --------------------------------------------------------
  // LOSS
  // --------------------------------------------------------

  if (result === "lost") {
    await UserStats.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: { userId },

        $inc: {
          gamesPlayed: 1,
          gamesLost: 1,
          totalKills: safeKills,
          totalTokensCaptured: safeTokensCaptured,
        },

        $set: {
          currentWinStreak: 0,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );

    return;
  }

  throw new Error(
    `Invalid game result: ${result}`
  );
};

// ============================================================
// RECORD FINAL GAME RESULTS FOR ALL PLAYERS
// ============================================================
//
// Called once when the game finishes.
//
// Temporary game statistics:
//
// statsTracking.players[userId] = {
//   kills: 3,
//   tokensCaptured: 2
// }
//
// These values are added to the permanent UserStats.
//
// ============================================================

export const recordCompletedGame = async ({
  game,
  result = "normal",
}) => {
  if (!game?.players || game.players.length === 0) {
    return {};
  }

  if (game.statsTracking?.finalized === true) {
    return {};
  }

  const finishOrder = Array.isArray(game.finishOrder)
    ? game.finishOrder
    : [];

  if (finishOrder.length !== game.players.length) {
    console.error(
      `[STATS] Cannot finalize game ${game.roomId || ""}: finish order is incomplete.`
    );

    return {};
  }

  const playerStats =
    game.statsTracking?.players || {};

  try {
    const completedStats = {};

    for (let index = 0; index < finishOrder.length; index++) {
      const userId = finishOrder[index];
      const position = index + 1;

      const player = game.players.find(
        (item) => item.userId === userId
      );

      if (!player) {
        continue;
      }

      const killsInGame =
        playerStats[userId]?.kills || 0;

      const tokensCapturedInGame =
        playerStats[userId]?.tokensCaptured || 0;

      let playerResult;

      if (position === game.players.length) {
        playerResult = "lost";
      } else {
        playerResult = "won";
      }

      // ------------------------------------------------------
      // COIN REWARD
      // ------------------------------------------------------

      const coinsEarned =
        getCoinRewardForPosition({
          position,
          playerCount: game.players.length,
        });

      if (coinsEarned > 0) {
        await addCoins(
          userId,
          coinsEarned
        );
      }

      // ------------------------------------------------------
      // PERMANENT USER STATS
      // ------------------------------------------------------

      await recordGameResult({
        userId,
        result: playerResult,
        position,
        killsInGame,
        tokensCapturedInGame,
      });

      const updatedStats =
        await getUserStats(userId);

      completedStats[userId] = {
        result: playerResult,
        position,
        kills: killsInGame,
        tokensCaptured:
          tokensCapturedInGame,
        coinsEarned,
        winStreak:
          updatedStats.currentWinStreak,
      };
    }

    // Mark game statistics as finalized
    if (game.statsTracking) {
      game.statsTracking.finalized = true;
    }

    console.log(
      `[STATS] Game ${
        game.roomId || ""
      } results and coin rewards recorded successfully`
    );

    return completedStats;
  } catch (error) {
    console.error(
      "[STATS] Failed to finalize completed game:",
      error
    );

    throw error;
  }
};