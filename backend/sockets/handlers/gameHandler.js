import { getRoom } from "../../services/room/roomManager.js";

import {
  rollGameDice,
  getLegalMoves,
  moveCoin,
  checkGameFinished,
  prepareGameExtraTurn,
  completeGameTurn,
} from "../../services/game/gameEngine.js";

import {
  startTurnTimer,
  clearTurnTimer,
  restartMovementTimer,
} from "../../services/game/turnTimer.js";

import { recordCompletedGame } from "../../services/stats/userStatsService.js";

/**
 * Registers real-time multiplayer game action events (roll dice, move coin).
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
export const registerGameHandler = (io, socket) => {
  // --------------------------------------------------------
  // ROLL DICE
  // --------------------------------------------------------
  socket.on("roll_dice", async (data, callback) => {
    const { roomId } = data || {};
    const userId = socket.data.userId || data?.userId || data?.playerId;

    // Authoritative server-side dice generation (prevents client tampering)
    // In automated test environments, allow test runner to supply deterministic value
    const isTestEnv = process.env.NODE_ENV === "test";
    const diceValue =
      isTestEnv &&
      Number.isInteger(data?.diceValue) &&
      data.diceValue >= 1 &&
      data.diceValue <= 6
        ? data.diceValue
        : Math.floor(Math.random() * 6) + 1;

    // Get room
    const room = getRoom({ roomId });
    if (!room) {
      return callback?.({
        success: false,
        reason: "Room not found.",
      });
    }

    // Game must be running
    if (!room.game) {
      return callback?.({
        success: false,
        reason: "Game has not started.",
      });
    }

    // Roll dice through game engine
    const result = rollGameDice({
      game: room.game,
      playerId: userId,
      diceValue,
    });

    if (!result.success) {
      return callback?.({
        success: false,
        reason: result.reason,
      });
    }

    // Update room game state
    room.game = result.game;

    const finishResult = checkGameFinished({
      game: room.game,
    });

    if (finishResult.finished) {
      room.game = finishResult.game;

      clearTurnTimer({
        roomId,
      });

      io.to(roomId).emit("game_finished", {
        game: room.game,
        winner: finishResult.winner,
      });

      callback?.({
        success: true,
        game: room.game,
        capture: result.capture,
        finished: true,
        winnerId: finishResult.winner.userId,
      });

      return;
    }

    // Get legal moves after dice roll
    const legalMoves = getLegalMoves({
      game: room.game,
    });

    // ------------------------------------------------------
    // NO LEGAL MOVE
    // ------------------------------------------------------
    if (legalMoves.length === 0) {
      // Automatically pass turn to next player
      const nextTurnResult = completeGameTurn({
        game: room.game,
      });

      if (!nextTurnResult.success) {
        return callback?.({
          success: false,
          reason: nextTurnResult.reason,
        });
      }

      room.game = nextTurnResult.game;
      startTurnTimer({
        io,
        room,
      });

      // Send response to player who rolled
      callback?.({
        success: true,
        diceValue: result.diceValue,
        legalMoves: [],
        game: room.game,
        turnPassed: true,
        reason: "No legal moves. Turn passed to next player.",
      });

      // Notify everyone in the room
      io.to(roomId).emit("dice_rolled", {
        playerId: userId,
        diceValue: result.diceValue,
        legalMoves: [],
        game: room.game,
        turnPassed: true,
        reason: "No legal moves. Turn passed to next player.",
      });

      return;
    }

    // ------------------------------------------------------
    // NORMAL RESULT
    // ------------------------------------------------------
    callback?.({
      success: true,
      diceValue: result.diceValue,
      legalMoves,
      game: room.game,
      turnPassed: false,
    });

    // Notify everyone in the room
    io.to(roomId).emit("dice_rolled", {
      playerId: userId,
      diceValue: result.diceValue,
      legalMoves,
      game: room.game,
      turnPassed: false,
    });

    if (legalMoves.length > 0) {
      restartMovementTimer({
        io,
        room,
      });
    }
  });

  // --------------------------------------------------------
  // MOVE COIN
  // --------------------------------------------------------
  socket.on("move_coin", async (data, callback) => {
    const { roomId, coinId, direction } = data || {};
    const userId = socket.data.userId || data?.userId || data?.playerId;

    // Get room
    const room = getRoom({ roomId });
    if (!room) {
      return callback?.({
        success: false,
        reason: "Room not found.",
      });
    }

    // Game must be running
    if (!room.game) {
      return callback?.({
        success: false,
        reason: "Game has not started.",
      });
    }

    // Move coin through game engine
    const result = moveCoin({
      game: room.game,
      playerId: userId,
      coinId,
      direction,
    });

    if (!result.success) {
      return callback?.({
        success: false,
        reason: result.reason,
      });
    }

    // Update room game state
    room.game = result.game;

    // ------------------------------------------------------
    // TRACK TEMPORARY GAME STATISTICS
    // ------------------------------------------------------
    const killedCoins = result.capture?.killedCoins || [];
    const killsThisMove = killedCoins.length;

    if (!room.game.statsTracking) {
      room.game.statsTracking = {
        finalized: false,
        players: {},
      };
    }

    room.game.players.forEach((player) => {
      if (!room.game.statsTracking.players[player.userId]) {
        room.game.statsTracking.players[player.userId] = {
          kills: 0,
          tokensCaptured: 0,
          forwardMoves: 0,
          backwardMoves: 0,
          totalMoves: 0,
        };
      }
    });

    // Record forward and backward moves
    const playerStats = room.game.statsTracking.players[userId];
    if (playerStats) {
      playerStats.totalMoves = (playerStats.totalMoves || 0) + 1;
      if (direction === "backward") {
        playerStats.backwardMoves = (playerStats.backwardMoves || 0) + 1;
      } else {
        playerStats.forwardMoves = (playerStats.forwardMoves || 0) + 1;
      }
    }

    if (killsThisMove > 0) {
      room.game.statsTracking.players[userId].kills += killsThisMove;

      killedCoins.forEach((killedCoin) => {
        const killedPlayerId = killedCoin.playerId;
        if (
          killedPlayerId &&
          room.game.statsTracking.players[killedPlayerId]
        ) {
          room.game.statsTracking.players[killedPlayerId].tokensCaptured += 1;
        }
      });
    }

    // Check Player Finish
    const previousFinishCount = room.game.finishOrder?.length || 0;
    const finishResult = checkGameFinished({
      game: room.game,
    });

    room.game = finishResult.game;
    const newFinishCount = room.game.finishOrder?.length || 0;
    const playerFinished = newFinishCount > previousFinishCount;

    clearTurnTimer({ roomId });

    callback?.({
      success: true,
      game: room.game,
      capture: result.capture,
    });

    io.to(roomId).emit("coin_moved", {
      playerId: userId,
      coinId,
      direction,
      game: room.game,
      capture: result.capture,
    });

    // ------------------------------------------------------
    // GAME FINISHED
    // ------------------------------------------------------
    if (room.game.status === "finished") {
      const winner = room.game.players.find(
        (player) => player.userId === room.game.winnerId
      );

      let completedStats = {};
      try {
        completedStats = await recordCompletedGame({
          game: room.game,
          result: "normal",
        });
      } catch (error) {
        console.error("Failed to record completed game statistics:", error);
      }

      io.to(roomId).emit("game_finished", {
        game: room.game,
        winner: winner || null,
        stats: completedStats,
      });

      return;
    }

    // ------------------------------------------------------
    // PLAYER FINISHED - GAME CONTINUES
    // ------------------------------------------------------
    if (playerFinished) {
      io.to(roomId).emit("turn_changed", {
        game: room.game,
      });

      startTurnTimer({
        io,
        room,
      });

      return;
    }

    // ------------------------------------------------------
    // EXTRA TURN
    // ------------------------------------------------------
    if (room.game.currentTurn.extraTurn === true) {
      const extraTurnResult = prepareGameExtraTurn({
        game: room.game,
      });

      if (!extraTurnResult.success) {
        return callback?.({
          success: false,
          reason: extraTurnResult.reason,
        });
      }

      room.game = extraTurnResult.game;

      io.to(roomId).emit("turn_changed", {
        game: room.game,
      });

      startTurnTimer({
        io,
        room,
      });

      return;
    }

    // ------------------------------------------------------
    // NORMAL TURN - NEXT PLAYER
    // ------------------------------------------------------
    const nextTurnResult = completeGameTurn({
      game: room.game,
    });

    if (!nextTurnResult.success) {
      return callback?.({
        success: false,
        reason: nextTurnResult.reason,
      });
    }

    room.game = nextTurnResult.game;

    io.to(roomId).emit("turn_changed", {
      game: room.game,
    });

    startTurnTimer({
      io,
      room,
    });
  });
};
