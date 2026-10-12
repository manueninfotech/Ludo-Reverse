import {
  isTurnExpired,
} from "./turn.js";

import {
  isValidDiceValue,
} from "./dice.js";

import {
  calculateMovement,
} from "./movement.js";

import {
  getCaptureResult,
  captureOpponents,
} from "./capture.js";

import {
  getPlayerById,
  getCoin,
} from "./gameStateFactory.js";

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
      reason: "Direction must be forward or backward.",
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
      reason: "Backward movement is not allowed on this roll.",
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
    playerCoins: player.coins,
  });

  if (!movement.legal) {
    return {
      success: false,
      reason: movement.reason,
      game,
    };
  }

  const reachedFinish = movement.toArea === "finished";

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

              progress: movement.toProgress,

              absoluteCell: movement.toAbsoluteCell,
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

  const destinationCell = movement.toAbsoluteCell;

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
      const captureExecution = captureOpponents({
        players: movedPlayers,
        movingPlayerId: playerId,
        destinationCell,
        playerCount: game.playerCount,
      });

      capturedCoins = captureExecution.killedCoins;

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
  const wasKill = capturedCoins.length > 0;

  // ----------------------------------------------------------
  // Create new game state
  // ----------------------------------------------------------
  let movedGame = {
    ...game,

    players: movedPlayers,

    moveCount: (game.moveCount || 0) + 1,
  };

  // ----------------------------------------------------------
  // Determine extra turn and backward permission
  // ----------------------------------------------------------
  if (wasKill) {
    movedGame = {
      ...movedGame,

      currentTurn: {
        ...movedGame.currentTurn,
        extraTurn: true,
        extraTurnReason: "kill",
        backwardAllowed: direction === "forward",
        hasRolled: false,
        diceValue: null,
      },
    };
  } else if (reachedFinish) {
    movedGame = {
      ...movedGame,

      currentTurn: {
        ...movedGame.currentTurn,
        extraTurn: true,
        extraTurnReason: "finish",
        hasRolled: false,
        diceValue: null,
      },
    };
  } else if (diceValue === 6) {
    const enteredFromBase =
      coin.area === "base" &&
      movement.enteredBoard === true;

    const backwardAllowedForExtraTurn =
      direction === "forward" && !enteredFromBase;

    movedGame = {
      ...movedGame,

      currentTurn: {
        ...movedGame.currentTurn,
        extraTurn: true,
        extraTurnReason: "six",
        backwardAllowed: backwardAllowedForExtraTurn,
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
        progress: coin.progress,
        absoluteCell: coin.absoluteCell,
      },

      to: {
        area: movement.toArea,
        progress: movement.toProgress,
        absoluteCell: movement.toAbsoluteCell,
      },
    },

    capture: {
      killed: wasKill,
      killedCoins: capturedCoins,
    },
  };
};
