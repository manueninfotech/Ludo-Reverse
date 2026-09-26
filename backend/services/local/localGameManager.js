// ============================================================
// REVERSE LUDO - LOCAL GAME MANAGER
// ============================================================
//
// This file does NOT contain game rules.
//
// The actual game rules remain inside:
// services/game/gameEngine.js
//
// This manager only stores Local / Pass & Play games in memory.
// ============================================================

import { randomUUID } from "node:crypto";

import {
  createInitialGameState,
} from "../game/gameEngine.js";

// ------------------------------------------------------------
// LOCAL GAME STORAGE
// ------------------------------------------------------------

const localGames = new Map();

// ------------------------------------------------------------
// PLAYER COLORS
// ------------------------------------------------------------

const PLAYER_COLORS = {
  2: ["red", "green"],

  3: ["red", "green", "yellow"],

  4: ["red", "green", "yellow", "blue"],

  5: [
    "red",
    "green",
    "yellow",
    "blue",
    "orange",
  ],

  6: [
    "red",
    "green",
    "orange",
    "blue",
    "yellow",
    "purple",
  ],

  7: [
    "red",
    "green",
    "orange",
    "blue",
    "yellow",
    "purple",
    "pink",
  ],

  8: [
    "red",
    "green",
    "orange",
    "blue",
    "yellow",
    "purple",
    "pink",
    "cyan",
  ],
};

// ------------------------------------------------------------
// CREATE LOCAL GAME
// ------------------------------------------------------------

export const createLocalGame = ({
  players,
}) => {
  if (!Array.isArray(players)) {
    return {
      success: false,
      reason: "Players must be an array.",
    };
  }

  const playerCount = players.length;

  if (
    playerCount < 2 ||
    playerCount > 8
  ) {
    return {
      success: false,
      reason:
        "Local game must have between 2 and 8 players.",
    };
  }

  const colors =
    PLAYER_COLORS[playerCount];

  if (!colors) {
    return {
      success: false,
      reason:
        "Unsupported local player count.",
    };
  }

  // ----------------------------------------------------------
  // Prepare players
  // ----------------------------------------------------------

  const gameId =
    `local-${randomUUID()}`;

  const preparedPlayers =
  players.map((player, index) => ({
    userId:
      `${gameId}-player-${index + 1}`,

    name:
      player.name?.trim() ||
      `Player ${index + 1}`,

    color:
      colors[index],

    isReady: true,

    isConnected: true,

    missedTurns: 0,
  }));

  // ----------------------------------------------------------
  // USE THE EXISTING GAME ENGINE
  // ----------------------------------------------------------

  const game = createInitialGameState({
  playerCount,
  players: preparedPlayers,
});

game.currentTurn = {
  ...game.currentTurn,
  turnExpiresAt: null,
};

  // ----------------------------------------------------------
  // STORE GAME
  // ----------------------------------------------------------

  localGames.set(
    gameId,
    game
  );

  return {
  success: true,
  localGame: {
    gameId,
    game,
  },
};
};

// ------------------------------------------------------------
// GET LOCAL GAME
// ------------------------------------------------------------

export const getLocalGame = ({
  gameId,
}) => {
  const game = localGames.get(gameId);

  if (!game) {
    return null;
  }

  return {
    gameId,
    game,
  };
};

// ------------------------------------------------------------
// UPDATE LOCAL GAME
// ------------------------------------------------------------

export const updateLocalGame = ({
  gameId,
  game,
}) => {
  if (!localGames.has(gameId)) {
    return {
      success: false,
      reason: "Local game not found.",
    };
  }

  localGames.set(
    gameId,
    game
  );

  return {
    success: true,
    game,
  };
};

// ------------------------------------------------------------
// DELETE LOCAL GAME
// ------------------------------------------------------------

export const deleteLocalGame = ({
  gameId,
}) => {
  localGames.delete(gameId);

  return {
    success: true,
  };
};