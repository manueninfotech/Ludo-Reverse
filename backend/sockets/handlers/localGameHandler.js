import {
  createLocalGame,
  getLocalGame,
  updateLocalGame,
} from "../../services/local/localGameManager.js";

import {
  rollGameDice,
  getLegalMoves,
  moveCoin,
  checkGameFinished,
  prepareGameExtraTurn,
  completeGameTurn,
} from "../../services/game/gameEngine.js";

import {
  startLocalTurnTimer,
  clearLocalTurnTimer,
} from "../../services/game/turnTimer.js";

/**
 * Registers local (pass-and-play / bot) socket game events.
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
export const registerLocalGameHandler = (io, socket) => {
  // ----------------------------------------------------------
  // CREATE LOCAL GAME
  // ----------------------------------------------------------
  socket.on("create_local_game", (data, callback) => {
    const result = createLocalGame({
      players: data?.players,
    });

    if (!result.success) {
      return callback?.({
        success: false,
        reason: result.reason,
      });
    }

    const { localGame } = result;

    startLocalTurnTimer({
      io,
      gameId: localGame.gameId,
    });

    socket.join(localGame.gameId);
    socket.data.localGameId = localGame.gameId;

    callback?.({
      success: true,
      localGame,
    });

    io.to(localGame.gameId).emit("local_game_created", localGame);
  });

  // ----------------------------------------------------------
  // LOCAL GAME - ROLL DICE
  // ----------------------------------------------------------
  socket.on("local_roll_dice", (data, callback) => {
    const { gameId, playerId } = data || {};

    const localGame = getLocalGame({ gameId });
    if (!localGame) {
      return callback?.({
        success: false,
        reason: "Local game not found.",
      });
    }

    const game = localGame.game;
    if (game.status !== "playing") {
      return callback?.({
        success: false,
        reason: "Game is not playing.",
      });
    }

    if (game.currentTurn.playerId !== playerId) {
      return callback?.({
        success: false,
        reason: "It is not this player's turn.",
      });
    }

    const diceValue = Math.floor(Math.random() * 6) + 1;

    const rollResult = rollGameDice({
      game,
      playerId,
      diceValue,
    });

    if (!rollResult.success) {
      return callback?.({
        success: false,
        reason: rollResult.reason,
      });
    }

    let updatedGame = rollResult.game;
    updateLocalGame({
      gameId,
      game: updatedGame,
    });

    const legalMoves = getLegalMoves({
      game: updatedGame,
    });

    // ------------------------------------------------------
    // NO LEGAL MOVE
    // ------------------------------------------------------
    if (legalMoves.length === 0) {
      const nextTurnResult = completeGameTurn({
        game: updatedGame,
      });

      if (!nextTurnResult.success) {
        return callback?.({
          success: false,
          reason: nextTurnResult.reason,
        });
      }

      updatedGame = nextTurnResult.game;
      updateLocalGame({
        gameId,
        game: updatedGame,
      });

      callback?.({
        success: true,
        game: updatedGame,
        diceValue,
        legalMoves: [],
        turnPassed: true,
        reason: "No legal moves. Turn passed to next player.",
      });

      io.to(gameId).emit("local_dice_rolled", {
        game: updatedGame,
        diceValue,
        legalMoves: [],
        turnPassed: true,
        reason: "No legal moves. Turn passed to next player.",
      });

      io.to(gameId).emit("local_turn_changed", {
        game: updatedGame,
        auto: true,
      });

      if (updatedGame.status === "playing") {
        startLocalTurnTimer({
          io,
          gameId,
        });
      }

      return;
    }

    // ------------------------------------------------------
    // NORMAL RESULT
    // ------------------------------------------------------
    callback?.({
      success: true,
      game: updatedGame,
      diceValue,
      legalMoves,
      turnPassed: false,
    });

    io.to(gameId).emit("local_dice_rolled", {
      game: updatedGame,
      diceValue,
      legalMoves,
      turnPassed: false,
    });
  });

  // ----------------------------------------------------------
  // LOCAL GAME - MOVE COIN
  // ----------------------------------------------------------
  socket.on("local_move_coin", (data, callback) => {
    const { gameId, playerId, coinId, direction } = data || {};

    const localGame = getLocalGame({ gameId });
    if (!localGame) {
      return callback?.({
        success: false,
        reason: "Local game not found.",
      });
    }

    const game = localGame.game;
    if (game.status !== "playing") {
      return callback?.({
        success: false,
        reason: "Game is not playing.",
      });
    }

    if (game.currentTurn.playerId !== playerId) {
      return callback?.({
        success: false,
        reason: "It is not this player's turn.",
      });
    }

    // Move Coin
    const moveResult = moveCoin({
      game,
      playerId,
      coinId,
      direction,
    });

    if (!moveResult.success) {
      return callback?.({
        success: false,
        reason: moveResult.reason,
      });
    }

    let updatedGame = moveResult.game;
    clearLocalTurnTimer({ gameId });

    // Check Finish
    const previousFinishCount = updatedGame.finishOrder?.length || 0;
    const finishResult = checkGameFinished({
      game: updatedGame,
    });

    updatedGame = finishResult.game;
    const newFinishCount = updatedGame.finishOrder?.length || 0;
    const playerFinished = newFinishCount > previousFinishCount;

    updateLocalGame({
      gameId,
      game: updatedGame,
    });

    // Game Finished
    if (updatedGame.status === "finished") {
      callback?.({
        success: true,
        game: updatedGame,
        capture: moveResult.capture,
        finished: true,
      });

      io.to(gameId).emit("local_coin_moved", {
        game: updatedGame,
        capture: moveResult.capture,
      });

      io.to(gameId).emit("local_game_finished", {
        game: updatedGame,
      });

      return;
    }

    // Player Finished - Game Continues
    if (playerFinished) {
      callback?.({
        success: true,
        game: updatedGame,
        capture: moveResult.capture,
      });

      io.to(gameId).emit("local_coin_moved", {
        game: updatedGame,
        capture: moveResult.capture,
      });

      io.to(gameId).emit("local_turn_changed", {
        game: updatedGame,
      });

      startLocalTurnTimer({
        io,
        gameId,
      });

      return;
    }

    // Extra Turn
    if (updatedGame.currentTurn.extraTurn === true) {
      const extraTurnResult = prepareGameExtraTurn({
        game: updatedGame,
      });

      if (!extraTurnResult.success) {
        return callback?.({
          success: false,
          reason: extraTurnResult.reason,
        });
      }

      updatedGame = extraTurnResult.game;
      updateLocalGame({
        gameId,
        game: updatedGame,
      });

      callback?.({
        success: true,
        game: updatedGame,
        capture: moveResult.capture,
      });

      io.to(gameId).emit("local_coin_moved", {
        game: updatedGame,
        capture: moveResult.capture,
      });

      io.to(gameId).emit("local_turn_changed", {
        game: updatedGame,
      });

      startLocalTurnTimer({
        io,
        gameId,
      });

      return;
    }

    // Normal Turn - Next Player
    const nextTurnResult = completeGameTurn({
      game: updatedGame,
    });

    if (!nextTurnResult.success) {
      return callback?.({
        success: false,
        reason: nextTurnResult.reason,
      });
    }

    updatedGame = nextTurnResult.game;
    updateLocalGame({
      gameId,
      game: updatedGame,
    });

    callback?.({
      success: true,
      game: updatedGame,
      capture: moveResult.capture,
    });

    io.to(gameId).emit("local_coin_moved", {
      game: updatedGame,
      capture: moveResult.capture,
    });

    io.to(gameId).emit("local_turn_changed", {
      game: updatedGame,
    });

    if (updatedGame.status === "playing") {
      startLocalTurnTimer({
        io,
        gameId,
      });
    }
  });
};
