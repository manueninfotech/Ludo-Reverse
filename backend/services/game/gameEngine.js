// ============================================================
// REVERSE LUDO - GAME ENGINE (MODULAR FACADE)
// ============================================================

import {
  getPossibleMoves,
  canCoinMove,
} from "./movement.js";

import {
  isValidDiceValue,
} from "./dice.js";

import {
  processDiceRoll,
  isTurnExpired,
} from "./turn.js";

import {
  createInitialGameState,
  getCurrentPlayer,
  getPlayerById,
  getCoin,
} from "./gameStateFactory.js";

import { moveCoin } from "./gameMoveExecutor.js";
import { checkWinner, checkGameFinished } from "./gameWinManager.js";
import { prepareGameExtraTurn, completeGameTurn } from "./gameTurnLifecycle.js";

// Re-export all submodules so existing imports remain 100% compatible
export {
  createInitialGameState,
  getCurrentPlayer,
  getPlayerById,
  getCoin,
} from "./gameStateFactory.js";

export { moveCoin } from "./gameMoveExecutor.js";
export { checkWinner, checkGameFinished } from "./gameWinManager.js";
export { prepareGameExtraTurn, completeGameTurn } from "./gameTurnLifecycle.js";

// ============================================================
// ROLL DICE
// ============================================================
export const rollGameDice = ({
  game,
  playerId,
  diceValue,
}) => {
  if (!game) {
    return {
      success: false,
      reason: "Game is required.",
      game: null,
    };
  }

  if (game.status !== "playing") {
    return {
      success: false,
      reason: "Game is not currently playing.",
      game,
    };
  }

  if (
    isTurnExpired({
      turn: game.currentTurn,
    })
  ) {
    return {
      success: false,
      reason: "Turn has expired.",
      game,
    };
  }

  if (
    playerId &&
    game.currentTurn.playerId !== playerId
  ) {
    return {
      success: false,
      reason: "It is not this player's turn.",
    };
  }

  if (!isValidDiceValue(diceValue)) {
    return {
      success: false,
      reason: "Invalid dice value.",
      game,
    };
  }

  const result = processDiceRoll({
    turn: game.currentTurn,
    diceValue,
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

    diceValue,
  };
};

// ============================================================
// GET LEGAL MOVES
// ============================================================
export const getLegalMoves = ({
  game,
}) => {
  if (!game) {
    return [];
  }

  const currentPlayer = getCurrentPlayer(game);

  if (!currentPlayer) {
    return [];
  }

  if (!game.currentTurn.hasRolled) {
    return [];
  }

  if (!isValidDiceValue(game.currentTurn.diceValue)) {
    return [];
  }

  return getPossibleMoves({
    playerColor: currentPlayer.color,
    playerCount: game.playerCount,
    coins: currentPlayer.coins,
    diceValue: game.currentTurn.diceValue,
    backwardAllowed: game.currentTurn.backwardAllowed,
  });
};

// ============================================================
// GET LEGAL DIRECTIONS FOR COIN
// ============================================================
export const getCoinLegalMoves = ({
  game,
  coinId,
}) => {
  if (!game) {
    return false;
  }

  const currentPlayer = getCurrentPlayer(game);

  if (!currentPlayer) {
    return false;
  }

  const coin = getCoin({
    player: currentPlayer,
    coinId,
  });

  if (!coin) {
    return false;
  }

  if (!game.currentTurn.hasRolled) {
    return false;
  }

  if (!isValidDiceValue(game.currentTurn.diceValue)) {
    return false;
  }

  return canCoinMove({
    playerColor: currentPlayer.color,
    playerCount: game.playerCount,
    coin,
    diceValue: game.currentTurn.diceValue,
    playerCoins: currentPlayer.coins,
  });
};

// ============================================================
// EXPORT DEFAULT
// ============================================================
export default {
  createInitialGameState,
  getCurrentPlayer,
  getPlayerById,
  getCoin,
  rollGameDice,
  getLegalMoves,
  getCoinLegalMoves,
  moveCoin,
  checkWinner,
  checkGameFinished,
  prepareGameExtraTurn,
  completeGameTurn,
};