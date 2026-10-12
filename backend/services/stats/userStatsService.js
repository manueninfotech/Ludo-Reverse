import UserStats from "../../models/UserStats.js";
import MatchRecord from "../../models/MatchRecord.js";

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
  forwardMovesInGame = 0,
  backwardMovesInGame = 0,
  totalMovesInGame = 0,
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

  const safeForwardMoves =
    Number.isInteger(forwardMovesInGame) && forwardMovesInGame > 0
      ? forwardMovesInGame
      : 0;

  const safeBackwardMoves =
    Number.isInteger(backwardMovesInGame) && backwardMovesInGame > 0
      ? backwardMovesInGame
      : 0;

  const safeTotalMoves =
    Number.isInteger(totalMovesInGame) && totalMovesInGame > 0
      ? totalMovesInGame
      : (safeForwardMoves + safeBackwardMoves);

  // Calculate XP gained from match
  let xpEarned = 20 + (safeKills * 10);
  if (result === "won" && position === 1) {
    xpEarned = 60 + (safeKills * 10);
  } else if (result === "won") {
    xpEarned = 40 + (safeKills * 10);
  }

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
          totalForwardMoves: safeForwardMoves,
          totalBackwardMoves: safeBackwardMoves,
          totalMoves: safeTotalMoves,
          xp: xpEarned,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );

    const s = await UserStats.findOne({ userId });
    if (s) {
      const computedLevel = Math.max(1, Math.floor((s.xp || 0) / 500) + 1);
      if (s.level !== computedLevel) {
        await UserStats.updateOne({ userId }, { $set: { level: computedLevel } });
      }
    }

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
          totalForwardMoves: safeForwardMoves,
          totalBackwardMoves: safeBackwardMoves,
          totalMoves: safeTotalMoves,
          xp: xpEarned,
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

    const s = await UserStats.findOne({ userId });
    if (s) {
      const computedLevel = Math.max(1, Math.floor((s.xp || 0) / 500) + 1);
      if (s.level !== computedLevel) {
        await UserStats.updateOne({ userId }, { $set: { level: computedLevel } });
      }
    }

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
          totalForwardMoves: safeForwardMoves,
          totalBackwardMoves: safeBackwardMoves,
          totalMoves: safeTotalMoves,
          xp: xpEarned,
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

    const s = await UserStats.findOne({ userId });
    if (s) {
      const computedLevel = Math.max(1, Math.floor((s.xp || 0) / 500) + 1);
      if (s.level !== computedLevel) {
        await UserStats.updateOne({ userId }, { $set: { level: computedLevel } });
      }
    }

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
    ? [...game.finishOrder]
    : [];

  if (game.winnerId && !finishOrder.includes(game.winnerId)) {
    finishOrder.unshift(game.winnerId);
  }

  for (const player of game.players) {
    if (!finishOrder.includes(player.userId)) {
      finishOrder.push(player.userId);
    }
  }

  if (finishOrder.length === 0) {
    console.error(
      `[STATS] Cannot finalize game ${game.roomId || ""}: no players found in finish order.`
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

      const forwardMovesInGame =
        playerStats[userId]?.forwardMoves || 0;

      const backwardMovesInGame =
        playerStats[userId]?.backwardMoves || 0;

      const totalMovesInGame =
        playerStats[userId]?.totalMoves ||
        (forwardMovesInGame + backwardMovesInGame);

      let playerResult = position === 1 ? "won" : "lost";

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
        forwardMovesInGame,
        backwardMovesInGame,
        totalMovesInGame,
      });

      const updatedStats =
        await getUserStats(userId);

      // ------------------------------------------------------
      // MATCH RECORD LOG
      // ------------------------------------------------------
      try {
        const allPlayerIds = game.players.map((p) => p.userId);
        const matchPlayers = game.players.map((p) => {
          const pIndex = finishOrder.indexOf(p.userId);
          const pPos = pIndex !== -1 ? pIndex + 1 : game.players.length;
          return {
            userId: p.userId,
            name: p.name,
            color: p.color,
            position: pPos,
            isWin: pPos === 1,
          };
        });

        await MatchRecord.create({
          userId,
          result: playerResult === "won" ? "WIN" : "LOSS",
          gameType: `${game.players.length}-Player Online Match`,
          score: coinsEarned > 0 ? `+${coinsEarned} Coins` : "+0 Coins",
          coinsAwarded: coinsEarned,
          isWin: playerResult === "won",
          roomId: game.roomId || null,
          playerIds: allPlayerIds,
          players: matchPlayers,
          playedAt: new Date(),
        });
      } catch (err) {
        console.error(`[STATS] Failed to create MatchRecord for ${userId}:`, err);
      }

      completedStats[userId] = {
        result: playerResult,
        position,
        kills: killsInGame,
        tokensCaptured: tokensCapturedInGame,
        forwardMoves: forwardMovesInGame,
        backwardMoves: backwardMovesInGame,
        totalMoves: totalMovesInGame,
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