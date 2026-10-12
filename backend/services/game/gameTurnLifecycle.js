import {
  prepareExtraTurn,
  completeTurn,
} from "./turn.js";

export const prepareGameExtraTurn = ({
  game,
}) => {
  if (!game) {
    return {
      success: false,
      reason: "Game is required.",
      game: null,
    };
  }

  const result = prepareExtraTurn({
    turn: game.currentTurn,
  });

  if (!result.success) {
    return {
      success: false,
      reason: result.reason,
      game,
    };
  }

  return {
    success: true,
    reason: null,
    game: {
      ...game,
      currentTurn: result.turn,
    },
  };
};

export const completeGameTurn = ({
  game,
}) => {
  if (!game) {
    return {
      success: false,
      reason: "Game is required.",
      game: null,
    };
  }

  const finishOrder = Array.isArray(game.finishOrder)
    ? game.finishOrder
    : [];

  let nextGame = {
    ...game,
  };

  // Try at most once for every player.
  // This prevents an infinite loop.
  for (
    let attempt = 0;
    attempt < game.players.length;
    attempt++
  ) {
    const result = completeTurn({
      players: nextGame.players,
      turn: nextGame.currentTurn,
    });

    if (!result.success) {
      return {
        success: false,
        reason: result.reason,
        game,
      };
    }

    nextGame = {
      ...nextGame,
      currentTurn: result.turn,
    };

    const nextPlayerId = nextGame.currentTurn.playerId;

    // If this player has NOT finished, this is the correct next turn.
    if (!finishOrder.includes(nextPlayerId)) {
      return {
        success: true,
        reason: null,
        game: nextGame,
      };
    }
  }

  return {
    success: false,
    reason: "No active player is available for the next turn.",
    game: nextGame,
  };
};
