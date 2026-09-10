// ============================================================
// REVERSE LUDO - GAME ENGINE
// ============================================================
//
// This file connects:
// - Board configuration
// - Movement logic
// - Dice logic
// - Capture logic
// - Turn logic
//
// This file handles the actual flow of a game turn.
//
// It does NOT:1`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
// - Save to MongoDB
// - Handle Express routes
// - Handle Socket.IO
// - Handle authentication
//
// ============================================================

import {
  getBoardConfig,
  getBoardType,
  getPlayerBoardInfo,
} from "./boardConfig.js";

import {
  calculateMovement,
  getPossibleMoves,
  canCoinMove,
} from "./movement.js";

import {
  isValidDiceValue,
} from "./dice.js";

import {
  getCaptureResult,
  captureOpponents,
} from "./capture.js";

import {
  createInitialTurn,
  startTurn,
  processDiceRoll,
  prepareExtraTurn,
  completeTurn,
  isTurnExpired,
} from "./turn.js";


// ============================================================
// CREATE INITIAL GAME STATE
// ============================================================

export const createInitialGameState = ({
  playerCount,
  players,
}) => {
  if (
    !Number.isInteger(playerCount) ||
    playerCount < 2 ||
    playerCount > 6
  ) {
    throw new Error(
      "Player count must be between 2 and 6."
    );
  }

  if (!Array.isArray(players)) {
    throw new Error("Players must be an array.");
  }

  if (players.length !== playerCount) {
    throw new Error(
      "Player count does not match players array."
    );
  }

  const board = getBoardConfig(playerCount);

  const preparedPlayers = players.map(
    (player, playerIndex) => {
      const boardInfo = getPlayerBoardInfo(
        playerCount,
        player.color
      );

      if (!boardInfo) {
        throw new Error(
          `Invalid color for ${playerCount}-player game: ${player.color}`
        );
      }

      return {
        ...player,

        startCell: boardInfo.startCell,

        coins: Array.from(
          { length: board.coinsPerPlayer },
          (_, coinIndex) => ({
            coinId: `${player.userId}-coin-${coinIndex + 1}`,

            area: "base",

            progress: -1,

            absoluteCell: null,
          })
        ),

        isReady:
          player.isReady ?? false,

        isConnected:
          player.isConnected ?? true,

        missedTurns:
          player.missedTurns ?? 0,
      };
    }
  );

  const firstPlayer =
    preparedPlayers[0];

  const turn = startTurn({
    playerId: firstPlayer.userId,
  });

  return {
    status: "playing",

    playerCount,

    boardType: getBoardType(playerCount),

    players: preparedPlayers,

    currentTurn: turn,

    winnerId: null,

    moveCount: 0,
  };
};


// ============================================================
// GET CURRENT PLAYER
// ============================================================

export const getCurrentPlayer = (game) => {
  if (!game || !game.currentTurn) {
    return null;
  }

  return (
    game.players?.find(
      (player) =>
        player.userId ===
        game.currentTurn.playerId
    ) || null
  );
};


// ============================================================
// GET PLAYER BY ID
// ============================================================

export const getPlayerById = ({
  game,
  playerId,
}) => {
  if (!game || !Array.isArray(game.players)) {
    return null;
  }

  return (
    game.players.find(
      (player) =>
        player.userId === playerId
    ) || null
  );
};


// ============================================================
// GET COIN
// ============================================================

export const getCoin = ({
  player,
  coinId,
}) => {
  if (!player || !Array.isArray(player.coins)) {
    return null;
  }

  return (
    player.coins.find(
      (coin) =>
        coin.coinId === coinId
    ) || null
  );
};


// ============================================================
// ROLL DICE
// ============================================================
//
// The actual random dice generation will happen elsewhere.
//
// The engine receives the dice value and applies it
// to the current turn.
//
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
//
// Returns all coins that can legally move for the
// current dice value.
//
// ============================================================

export const getLegalMoves = ({
  game,
}) => {
  if (!game) {
    return [];
  }

  const currentPlayer =
    getCurrentPlayer(game);

  if (!currentPlayer) {
    return [];
  }

  if (!game.currentTurn.hasRolled) {
    return [];
  }

  if (!isValidDiceValue(
    game.currentTurn.diceValue
  )) {
    return [];
  }

  return getPossibleMoves({
    playerColor: currentPlayer.color,

    playerCount: game.playerCount,

    coins: currentPlayer.coins,

    diceValue: game.currentTurn.diceValue,

    backwardAllowed:
      game.currentTurn.backwardAllowed,
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
  });
};

// ============================================================
// MOVE COIN
// ============================================================

export const moveCoin = ({
  game,
  playerId,
  coinId,
  direction,
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

  // ----------------------------------------------------------
  // Validate turn
  // ----------------------------------------------------------

  if (game.currentTurn.playerId !== playerId) {
    return {
      success: false,
      reason: "It is not this player's turn.",
      game,
    };
  }

  // ----------------------------------------------------------
  // Validate timeout
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Validate dice
  // ----------------------------------------------------------

  if (!game.currentTurn.hasRolled) {
    return {
      success: false,
      reason: "Dice must be rolled first.",
      game,
    };
  }

  const diceValue = game.currentTurn.diceValue;

  if (!isValidDiceValue(diceValue)) {
    return {
      success: false,
      reason: "Invalid dice value.",
      game,
    };
  }

  // ----------------------------------------------------------
  // Find player
  // ----------------------------------------------------------

  const player = getPlayerById({
    game,
    playerId,
  });

  if (!player) {
    return {
      success: false,
      reason: "Player not found.",
      game,
    };
  }

  // ----------------------------------------------------------
  // Find coin
  // ----------------------------------------------------------

  const coin = getCoin({
    player,
    coinId,
  });

  if (!coin) {
    return {
      success: false,
      reason: "Coin not found.",
      game,
    };
  }

  // ----------------------------------------------------------
  // Validate direction
  // ----------------------------------------------------------

  if (
    direction !== "forward" &&
    direction !== "backward"
  ) {
    return {
      success: false,
      reason:
        "Direction must be forward or backward.",
      game,
    };
  }

  // ----------------------------------------------------------
  // Backward restriction
  // ----------------------------------------------------------

  if (
    direction === "backward" &&
    game.currentTurn.backwardAllowed !== true
  ) {
    return {
      success: false,
      reason:
        "Backward movement is not allowed on this roll.",
      game,
    };
  }

  // ----------------------------------------------------------
  // Calculate movement
  // ----------------------------------------------------------

  const movement = calculateMovement({
    playerColor: player.color,
    playerCount: game.playerCount,
    coin,
    diceValue,
    direction,
  });

  if (!movement.legal) {
    return {
      success: false,
      reason: movement.reason,
      game,
    };
  }
  const reachedFinish =
  movement.toArea === "finished";

  // ----------------------------------------------------------
  // Move the selected coin
  // ----------------------------------------------------------

  const movedPlayers = game.players.map(
    (gamePlayer) => {
      if (gamePlayer.userId !== playerId) {
        return gamePlayer;
      }

      return {
        ...gamePlayer,

        coins: gamePlayer.coins.map(
          (gameCoin) => {
            if (gameCoin.coinId !== coinId) {
              return gameCoin;
            }

            return {
              ...gameCoin,

              area: movement.toArea,

              progress:
                movement.toProgress,

              absoluteCell:
                movement.toAbsoluteCell,
            };
          }
        ),
      };
    }
  );

  // ----------------------------------------------------------
  // Capture / Kill
  // ----------------------------------------------------------

  let capturedCoins = [];

  const destinationCell =
    movement.toAbsoluteCell;

  if (
    movement.toArea === "main" &&
    Number.isInteger(destinationCell)
  ) {
    const captureResult = getCaptureResult({
      players: movedPlayers,
      movingPlayerId: playerId,
      destinationCell,
      playerCount: game.playerCount,
    });

    if (captureResult.canKill) {
      const captureExecution =
        captureOpponents({
          players: movedPlayers,
          movingPlayerId: playerId,
          destinationCell,
          playerCount: game.playerCount,
        });

      capturedCoins =
        captureExecution.killedCoins;

      // Replace players with the captured state.
      movedPlayers.splice(
        0,
        movedPlayers.length,
        ...captureExecution.players
      );
    }
  }

  // ----------------------------------------------------------
  // Determine whether a kill happened
  // ----------------------------------------------------------

  const wasKill =
    capturedCoins.length > 0;

  // ----------------------------------------------------------
  // Create new game state
  // ----------------------------------------------------------

  let movedGame = {
    ...game,

    players: movedPlayers,

    moveCount:
      (game.moveCount || 0) + 1,
  };

// ----------------------------------------------------------
// Determine extra turn and backward permission
// ----------------------------------------------------------

// Kill gives an extra turn.
//
// Forward kill  → backward allowed on extra roll
// Backward kill → backward NOT allowed on extra roll
if (wasKill) {
  movedGame = {
    ...movedGame,

    currentTurn: {
      ...movedGame.currentTurn,

      // Same player gets another roll
      extraTurn: true,

      extraTurnReason: "kill",

      // Forward kill allows backward on extra roll.
      // Backward kill does not.
      backwardAllowed: direction === "forward",

      // Prepare for the next dice roll
      hasRolled: false,
      diceValue: null,
    },
  };
}

// Coin reaches finish → extra turn
else if (reachedFinish) {
  movedGame = {
    ...movedGame,

    currentTurn: {
      ...movedGame.currentTurn,

      // Same player gets another roll
      extraTurn: true,

      extraTurnReason: "finish",

      // Prepare for the next dice roll
      hasRolled: false,
      diceValue: null,
    },
  };
}

// Rolling 6 gives an extra turn.
//
// 6 + forward move → backward allowed
// 6 + backward move → backward NOT allowed
// 6 + base entry  → backward NOT allowed
else if (diceValue === 6) {
  const enteredFromBase =
    coin.area === "base" &&
    movement.enteredBoard === true;

  const backwardAllowedForExtraTurn =
    direction === "forward" &&
    !enteredFromBase;

  movedGame = {
    ...movedGame,

    currentTurn: {
      ...movedGame.currentTurn,

      // Same player gets another roll
      extraTurn: true,

      extraTurnReason: "six",

      backwardAllowed:
        backwardAllowedForExtraTurn,

      // Prepare for the next dice roll
      hasRolled: false,
      diceValue: null,
    },
  };
}
  // ----------------------------------------------------------
  // Return result
  // ----------------------------------------------------------

  return {
    success: true,

    reason: null,

    game: movedGame,

    move: {
      playerId,

      coinId,

      direction,

      diceValue,

      from: {
        area: coin.area,

        progress:
          coin.progress,

        absoluteCell:
          coin.absoluteCell,
      },

      to: {
        area:
          movement.toArea,

        progress:
          movement.toProgress,

        absoluteCell:
          movement.toAbsoluteCell,
      },
    },

    capture: {
      killed: wasKill,

      killedCoins: capturedCoins,
    },
  };
};


// ============================================================
// CHECK WINNER
// ============================================================

export const checkWinner = ({
  game,
}) => {
  if (!game || !Array.isArray(game.players)) {
    return null;
  }

  const winner =
    game.players.find(
      (player) =>
        Array.isArray(player.coins) &&
        player.coins.length === 4 &&
        player.coins.every(
          (coin) =>
            coin.area === "finished"
        )
    );

  return winner || null;
};


// ============================================================
// FINISH GAME IF PLAYER WON
// ============================================================

export const checkGameFinished = ({
  game,
}) => {
  const winner = checkWinner({
    game,
  });

  if (!winner) {
    return {
      finished: false,

      game,
    };
  }

  return {
    finished: true,

    game: {
      ...game,

      status: "finished",

      winnerId:
        winner.userId,
    },

    winner,
  };
};


// ============================================================
// PREPARE EXTRA TURN
// ============================================================

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


// ============================================================
// COMPLETE CURRENT TURN
// ============================================================
//
// Moves to the next player.
//
// ============================================================

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

  const result = completeTurn({
    players: game.players,

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