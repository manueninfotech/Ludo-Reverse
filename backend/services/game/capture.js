// ============================================================
// REVERSE LUDO - CAPTURE / KILL LOGIC
// ============================================================
//
// This file handles:
// - Finding opponent coins on a cell
// - Checking whether a coin can be killed
// - Normal forward kills
// - Reverse/backward kills
// - Safe-cell protection
// - Sending killed coins back to base
// - Detecting whether a kill happened
//
// This file does NOT:
// - Roll dice
// - Calculate movement
// - Change turns
// - Save to MongoDB
// - Decide the winner
//
// ============================================================

import { getBoardConfig } from "./boardConfig.js";


// ============================================================
// CHECK WHETHER A COIN IS ON THE MAIN TRACK
// ============================================================

export const isCoinOnMainTrack = (coin) => {
  return (
    coin &&
    coin.area === "main" &&
    Number.isInteger(coin.progress) &&
    coin.progress >= 0
  );
};


// ============================================================
// GET COIN ABSOLUTE CELL
// ============================================================
//
// We calculate the shared-board cell using:
// player's starting cell + player's relative progress.
//
// ============================================================

export const getCoinAbsoluteCell = ({
  playerColor,
  playerCount,
  coin,
}) => {
  const board = getBoardConfig(playerCount);

  if (!board) {
    return null;
  }

  if (!isCoinOnMainTrack(coin)) {
    return null;
  }

  const startCell = board.startCells[playerColor];

  if (startCell === undefined) {
    return null;
  }

  return (
    (startCell + coin.progress) %
    board.trackSize
  );
};


// ============================================================
// CHECK WHETHER A CELL IS SAFE
// ============================================================

export const isSafeCellForGame = ({
  playerCount,
  absoluteCell,
}) => {
  const board = getBoardConfig(playerCount);

  if (!board) {
    return false;
  }

  return board.safeCells.includes(absoluteCell);
};


// ============================================================
// FIND OPPONENT COINS ON DESTINATION CELL
// ============================================================
//
// players = game.players
//
// destinationCell = actual shared-board cell
//
// movingPlayerId = player making the move
//
// Returns all opponent coins occupying that cell.
//
// ============================================================

export const findOpponentCoinsAtCell = ({
  players,
  movingPlayerId,
  destinationCell,
  playerCount,
}) => {
  if (!Array.isArray(players)) {
    return [];
  }

  if (!Number.isInteger(destinationCell)) {
    return [];
  }

  const opponents = [];

  for (const player of players) {
    // Skip the player who is moving
    if (player.userId === movingPlayerId) {
      continue;
    }

    if (!Array.isArray(player.coins)) {
      continue;
    }

    for (const coin of player.coins) {
      if (!isCoinOnMainTrack(coin)) {
        continue;
      }

      const coinCell = getCoinAbsoluteCell({
        playerColor: player.color,
        playerCount,
        coin,
      });

      if (coinCell === destinationCell) {
        opponents.push({
          playerId: player.userId,
          playerColor: player.color,
          coin,
          coinId: coin.coinId,
        });
      }
    }
  }

  return opponents;
};


// ============================================================
// CHECK WHETHER A KILL IS POSSIBLE
// ============================================================
//
// A kill is possible when:
// 1. Destination is on the main track
// 2. Destination is NOT a safe cell
// 3. An opponent coin occupies that cell
//
// Direction does not matter.
//
// Therefore:
// - Forward kill -> possible
// - Backward kill -> possible
//
// ============================================================

export const canCapture = ({
  players,
  movingPlayerId,
  destinationCell,
  playerCount,
}) => {
  const board = getBoardConfig(playerCount);

  if (!board) {
    return {
      canKill: false,
      reason: "Invalid player count.",
      opponents: [],
    };
  }

  if (!Number.isInteger(destinationCell)) {
    return {
      canKill: false,
      reason: "Invalid destination cell.",
      opponents: [],
    };
  }

  // ----------------------------------------------------------
  // Safe cell protection
  // ----------------------------------------------------------

  if (board.safeCells.includes(destinationCell)) {
    return {
      canKill: false,
      reason: "Coins on safe cells cannot be killed.",
      opponents: [],
    };
  }

  // ----------------------------------------------------------
  // Find opponents
  // ----------------------------------------------------------

  const opponents = findOpponentCoinsAtCell({
    players,
    movingPlayerId,
    destinationCell,
    playerCount,
  });

  if (opponents.length === 0) {
    return {
      canKill: false,
      reason: "No opponent coin on destination cell.",
      opponents: [],
    };
  }

  return {
    canKill: true,
    reason: null,
    opponents,
  };
};


// ============================================================
// RESET COIN TO BASE
// ============================================================
//
// When a coin is killed:
// - area -> base
// - progress -> -1
// - absoluteCell -> null
//
// ============================================================

export const resetCoinToBase = (coin) => {
  if (!coin) {
    return null;
  }

  return {
    ...coin,
    area: "base",
    progress: -1,
    absoluteCell: null,
  };
};


// ============================================================
// CAPTURE OPPONENT COINS
// ============================================================
//
// This function does NOT mutate the original players array.
//
// It returns the IDs of killed coins and a new players array.
//
// ============================================================

export const captureOpponents = ({
  players,
  movingPlayerId,
  destinationCell,
  playerCount,
}) => {
  const captureResult = canCapture({
    players,
    movingPlayerId,
    destinationCell,
    playerCount,
  });

  if (!captureResult.canKill) {
    return {
      killed: false,
      killedCoins: [],
      players,
    };
  }

  const killedCoins = [];

  const updatedPlayers = players.map((player) => {
    // Only opponent players can be affected
    if (player.userId === movingPlayerId) {
      return player;
    }

    const updatedCoins = player.coins.map((coin) => {
      const coinCell = getCoinAbsoluteCell({
        playerColor: player.color,
        playerCount,
        coin,
      });

      const shouldKill =
        isCoinOnMainTrack(coin) &&
        coinCell === destinationCell;

      if (!shouldKill) {
        return coin;
      }

      killedCoins.push({
        playerId: player.userId,
        playerColor: player.color,
        coinId: coin.coinId,
      });

      return resetCoinToBase(coin);
    });

    return {
      ...player,
      coins: updatedCoins,
    };
  });

  return {
    killed: killedCoins.length > 0,
    killedCoins,
    players: updatedPlayers,
  };
};


// ============================================================
// GET CAPTURE RESULT
// ============================================================
//
// This is a convenient function for the game engine.
//
// It tells us:
// - Whether a kill happened
// - Which coins were killed
// - Why capture was or wasn't possible
//
// ============================================================

export const getCaptureResult = ({
  players,
  movingPlayerId,
  destinationCell,
  playerCount,
}) => {
  const result = canCapture({
    players,
    movingPlayerId,
    destinationCell,
    playerCount,
  });

  return {
    canKill: result.canKill,
    reason: result.reason,
    opponents: result.opponents,
  };
};


// ============================================================
// CHECK WHETHER CAPTURE GIVES EXTRA TURN
// ============================================================
//
// In Reverse Ludo:
//
// Killing an opponent gives another roll.
//
// Backward or forward does not change this.
//
// ============================================================

export const getsExtraTurnFromCapture = (wasKill) => {
  return wasKill === true;
};


// ============================================================
// GET CAPTURE EVENT
// ============================================================
//
// Used later by the game engine/socket layer.
//
// ============================================================

export const createCaptureEvent = ({
  movingPlayerId,
  destinationCell,
  killedCoins,
}) => {
  return {
    type: "coin_killed",
    playerId: movingPlayerId,
    destinationCell,
    killedCoins,
    extraTurn: killedCoins.length > 0,
    extraTurnReason:
      killedCoins.length > 0 ? "kill" : null,
  };
};