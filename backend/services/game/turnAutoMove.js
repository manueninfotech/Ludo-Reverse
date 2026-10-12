import {
  moveCoin,
  checkGameFinished,
  prepareGameExtraTurn,
  completeGameTurn,
} from "./gameEngine.js";

import {
  recordCompletedGame,
} from "../stats/userStatsService.js";

/**
 * Determine whether a move should be automatically executed.
 *
 * Rules:
 * - Base/Yard: Movable coins are in base (can only unlock to start tile) -> true
 * - Home Path: Single movable coin is in home path (can only advance forward) -> true
 * - Track: Coins on main track require manual player decision (forward vs backward) -> false
 */
export const shouldAutoMove = ({
  game,
  legalMoves,
}) => {
  if (!legalMoves || legalMoves.length === 0) {
    return false;
  }

  const currentPlayer = game?.players?.find(
    (player) => player.userId === game.currentTurn?.playerId
  );

  if (!currentPlayer) {
    return false;
  }

  const movableCoins = legalMoves
    .map((move) =>
      currentPlayer.coins?.find((coin) => coin.coinId === move.coinId)
    )
    .filter(Boolean);

  if (movableCoins.length === 0) {
    return false;
  }

  // Case 1: All movable coins are in the base/yard (can only unlock to start tile)
  if (movableCoins.every((coin) => coin.area === "base")) {
    return true;
  }

  // Case 2: Single movable coin in home path (can only advance forward)
  if (
    movableCoins.length === 1 &&
    (movableCoins[0].area === "home" || movableCoins[0].area === "homePath")
  ) {
    return true;
  }

  // Case 3: Exactly 1 legal move in the entire game (no choice of coin or direction)
  if (legalMoves.length === 1) {
    return true;
  }

  // Case 4: Single movable coin on start tile (progress === 0)
  // Backward is impossible (would be < 0), only forward exists -> 100% deterministic.
  if (
    movableCoins.length === 1 &&
    movableCoins[0].area === "main" &&
    (movableCoins[0].progress === 0 || movableCoins[0].stepCount === 0)
  ) {
    return true;
  }

  // Case 5: All movable coins are on start tile (progress === 0)
  if (
    movableCoins.every(
      (coin) =>
        coin.area === "main" &&
        (coin.progress === 0 || coin.stepCount === 0)
    ) &&
    !legalMoves.some((move) => move.direction === "backward")
  ) {
    return true;
  }

  // Case 6: Single movable coin where no backward move is legal
  if (
    movableCoins.length === 1 &&
    !legalMoves.some((move) => move.direction === "backward")
  ) {
    return true;
  }

  return false;
};

/**
 * Perform an automatic legal move on turn timeout.
 */
export const performAutomaticMove = async ({
  io,
  room,
  legalMoves,
  clearTurnTimer,
  startTurnTimer,
}) => {
  if (!room?.game || legalMoves.length === 0) {
    return;
  }

  const currentPlayerId = room.game.currentTurn.playerId;

  /**
   * Prefer forward when both directions are legal.
   */
  const selectedMove =
    legalMoves.find(
      (move) => move.direction === "forward"
    ) || legalMoves[0];

  const gameForAutoMove = {
    ...room.game,
    currentTurn: {
      ...room.game.currentTurn,
      turnExpiresAt: null,
    },
  };

  const moveResult = moveCoin({
    game: gameForAutoMove,
    playerId: currentPlayerId,
    coinId: selectedMove.coinId,
    direction: selectedMove.direction,
  });

  if (!moveResult.success) {
    return;
  }

  room.game = moveResult.game;

  const killsThisMove =
    moveResult.capture?.killedCoins?.length || 0;

  // Track moves and kills in game stats
  if (!room.game.statsTracking) {
    room.game.statsTracking = {
      finalized: false,
      players: {},
    };
  }
  if (!room.game.statsTracking.players[currentPlayerId]) {
    room.game.statsTracking.players[currentPlayerId] = {
      kills: 0,
      tokensCaptured: 0,
      forwardMoves: 0,
      backwardMoves: 0,
      totalMoves: 0,
    };
  }
  const autoStats = room.game.statsTracking.players[currentPlayerId];
  autoStats.totalMoves = (autoStats.totalMoves || 0) + 1;
  if (selectedMove?.direction === "backward") {
    autoStats.backwardMoves = (autoStats.backwardMoves || 0) + 1;
  } else {
    autoStats.forwardMoves = (autoStats.forwardMoves || 0) + 1;
  }
  if (killsThisMove > 0) {
    autoStats.kills += killsThisMove;
  }

  io.to(room.roomId).emit("coin_moved", {
    game: room.game,
    coinId: selectedMove.coinId,
    direction: selectedMove.direction,
    capture: moveResult.capture,
    auto: true,
  });

  // ------------------------------------------------------
  // CHECK PLAYER FINISH
  // ------------------------------------------------------
  const previousFinishCount = room.game.finishOrder?.length || 0;

  const finishResult = checkGameFinished({
    game: room.game,
  });

  room.game = finishResult.game;

  const newFinishCount = room.game.finishOrder?.length || 0;
  const playerFinished = newFinishCount > previousFinishCount;

  /**
   * If the move produced a winner/game finish,
   * don't start another timer.
   */
  if (room.game.status === "finished") {
    if (clearTurnTimer) {
      clearTurnTimer({ roomId: room.roomId });
    }

    const winner =
      room.game.players.find((p) => p.userId === room.game.winnerId) ||
      (room.game.finishOrder && room.game.finishOrder.length > 0
        ? room.game.players.find((p) => p.userId === room.game.finishOrder[0])
        : null);

    let completedStats = {};

    try {
      completedStats = await recordCompletedGame({
        game: room.game,
        result: "normal",
      });
    } catch (error) {
      console.error(
        "Failed to record automatic game completion statistics:",
        error
      );
    }

    io.to(room.roomId).emit("game_finished", {
      game: room.game,
      winner: winner || null,
      stats: completedStats,
      auto: true,
    });

    return;
  }

  // ------------------------------------------------------
  // PLAYER FINISHED - GAME CONTINUES
  // ------------------------------------------------------
  if (playerFinished) {
    io.to(room.roomId).emit("turn_changed", {
      game: room.game,
      auto: true,
    });

    if (startTurnTimer) {
      startTurnTimer({
        io,
        room,
      });
    }

    return;
  }

  /**
   * Extra turn:
   * same player gets a fresh roll.
   */
  if (room.game.currentTurn.extraTurn) {
    const extraTurnResult = prepareGameExtraTurn({
      game: room.game,
    });

    if (!extraTurnResult.success) {
      console.error(
        "Automatic extra turn preparation failed:",
        extraTurnResult.reason
      );
      return;
    }

    room.game = extraTurnResult.game;

    io.to(room.roomId).emit("turn_changed", {
      game: room.game,
      auto: true,
    });

    if (startTurnTimer) {
      startTurnTimer({
        io,
        room,
      });
    }

    return;
  }

  /**
   * Normal move:
   * pass to next player.
   */
  const nextTurnResult = completeGameTurn({
    game: room.game,
  });

  if (!nextTurnResult.success) {
    console.error(
      "Automatic turn change failed:",
      nextTurnResult.reason
    );
    return;
  }

  room.game = nextTurnResult.game;

  io.to(room.roomId).emit("turn_changed", {
    game: room.game,
    auto: true,
  });

  if (room.game.status === "playing" && startTurnTimer) {
    startTurnTimer({
      io,
      room,
    });
  }
};
