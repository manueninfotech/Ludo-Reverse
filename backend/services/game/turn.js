// ============================================================
// REVERSE LUDO - TURN LOGIC
// ============================================================
//
// This file handles:
// - Player turn order
// - Starting a turn
// - Rolling state
// - Extra turns
// - Extra turn from rolling 6
// - Extra turn from killing
// - Backward movement permission
// - Moving to the next player
// - Turn timeout information
//
// This file does NOT:
// - Roll the actual dice
// - Move coins
// - Capture coins
// - Save to MongoDB
// - Handle Socket.IO
//
// ============================================================

import {
  isValidDiceValue,
  getsExtraTurnFromSix,
  isBackwardAllowed,
  getExtraTurnReason,
} from "./dice.js";


// ============================================================
// CONSTANTS
// ============================================================

export const TURN_TIMEOUT_MS = 30 * 1000;


// ============================================================
// CREATE INITIAL TURN
// ============================================================
//
// Creates the turn state when a game begins.
//
// ============================================================

export const createInitialTurn = (playerId = null) => {
  return {
    playerId,
    diceValue: null,
    hasRolled: false,
    backwardAllowed: true,
    extraTurn: false,
    extraTurnReason: null,
    turnStartedAt: null,
    turnExpiresAt: null,
  };
};


// ============================================================
// GET NEXT PLAYER INDEX
// ============================================================
//
// Example:
//
// Players:
// [Red, Green, Yellow, Blue]
//
// Current index:
// 0
//
// Next:
// 1
//
// When current player is the last player,
// it wraps back to index 0.
//
// ============================================================

export const getNextPlayerIndex = ({
  currentIndex,
  playerCount,
}) => {
  if (
    !Number.isInteger(currentIndex) ||
    !Number.isInteger(playerCount) ||
    playerCount <= 0
  ) {
    return null;
  }

  return (currentIndex + 1) % playerCount;
};


// ============================================================
// GET NEXT PLAYER
// ============================================================

export const getNextPlayer = ({
  players,
  currentPlayerId,
}) => {
  if (!Array.isArray(players) || players.length === 0) {
    return null;
  }

  const currentIndex = players.findIndex(
    (player) => player.userId === currentPlayerId
  );

  if (currentIndex === -1) {
    return null;
  }

  // Check every player after the current player,
  // wrapping around the player list.
  for (let step = 1; step <= players.length; step++) {
    const nextIndex =
      (currentIndex + step) % players.length;

    const nextPlayer = players[nextIndex];

    // A player who has finished all 4 coins
    // must not receive another turn.
    const hasFinished =
      Array.isArray(nextPlayer.coins) &&
      nextPlayer.coins.length === 4 &&
      nextPlayer.coins.every(
        (coin) => coin.area === "finished"
      );

    const isDisconnected =
      nextPlayer.isConnected === false;

    if (!hasFinished && !isDisconnected) {
      return nextPlayer;
    }
  }

  return null;
};


// ============================================================
// GET TURN START / EXPIRY TIMES
// ============================================================

export const getTurnTimes = ({
  now = new Date(),
  timeoutMs = TURN_TIMEOUT_MS,
}) => {
  const turnStartedAt = new Date(now);

  const turnExpiresAt = new Date(
    turnStartedAt.getTime() + timeoutMs
  );

  return {
    turnStartedAt,
    turnExpiresAt,
  };
};


// ============================================================
// START TURN
// ============================================================
//
// A normal turn starts with:
// - no dice
// - hasRolled = false
// - backwardAllowed = true
// - no extra turn
//
// ============================================================

export const startTurn = ({
  playerId,
  now = new Date(),
  timeoutMs = TURN_TIMEOUT_MS,
}) => {
  const { turnStartedAt, turnExpiresAt } = getTurnTimes({
    now,
    timeoutMs,
  });

  return {
    playerId,
    diceValue: null,
    hasRolled: false,
    backwardAllowed: true,
    extraTurn: false,
    extraTurnReason: null,
    turnStartedAt,
    turnExpiresAt,
  };
};


// ============================================================
// PROCESS DICE ROLL
// ============================================================
//
// This updates the current turn after a dice roll.
//
// Important:
// - Normal roll 1-5:
//   backward movement is allowed.
//
// - Normal roll 6:
//   extra turn is created.
//   backward movement is disabled.
//
// - Extra roll:
//   backward movement is disabled,
//   regardless of the dice value.
//
// - Extra roll of 6:
//   another extra turn is created.
//
// ============================================================

export const processDiceRoll = ({
  turn,
  diceValue,
}) => {
  if (!turn) {
    return {
      success: false,
      reason: "Turn is required.",
      turn: null,
    };
  }

  if (!isValidDiceValue(diceValue)) {
    return {
      success: false,
      reason: "Invalid dice value.",
      turn,
    };
  }

  // Prevent rolling twice in the same turn state.
  if (turn.hasRolled) {
    return {
      success: false,
      reason: "Dice has already been rolled for this turn.",
      turn,
    };
  }

 // If extraTurn is already true here,
// this roll is the EXTRA ROLL.
//
// prepareExtraTurn() keeps extraTurn = true
// until this roll happens.
const isExtraRoll = turn.extraTurn === true;

const rolledSix = getsExtraTurnFromSix(diceValue);

// A new extra turn is created only when
// THIS roll is a 6.
const newExtraTurn = rolledSix;

// Backward movement:
//
// Normal roll -> allowed
// First roll of 6 -> allowed
// Extra roll -> use the permission that was
//                decided after the previous move.
//
// IMPORTANT:
// We cannot decide the backward permission for
// a 6's EXTRA ROLL here because we don't yet know
// whether the player will use the 6 forward or backward.
//
// gameEngine.moveCoin() will update backwardAllowed
// after the actual move.
const backwardAllowed = isExtraRoll
  ? turn.backwardAllowed === true
  : true;

  return {
    success: true,
    reason: null,

    turn: {
      ...turn,

      diceValue,

      hasRolled: true,

      extraTurn: newExtraTurn,

      extraTurnReason: rolledSix
        ? "six"
        : null,

      backwardAllowed,
    },
  };
};

// ============================================================
// PROCESS KILL
// ============================================================
//
// Called after a successful capture.
//
// A kill:
// - gives an extra turn
// - disables backward movement on that extra turn
//
// ============================================================

export const processKill = ({
  turn,
}) => {
  if (!turn) {
    return {
      success: false,
      reason: "Turn is required.",
      turn: null,
    };
  }

  return {
    success: true,
    reason: null,

    turn: {
      ...turn,
      extraTurn: true,
      extraTurnReason: "kill",
      backwardAllowed: false,
    },
  };
};


// ============================================================
// DETERMINE EXTRA TURN
// ============================================================
//
// Checks whether the player should receive another roll.
//
// Priority:
// 1. Kill
// 2. Rolling 6
//
// ============================================================

export const determineExtraTurn = ({
  diceValue,
  wasKill = false,
}) => {
  const extraTurn = wasKill || diceValue === 6;

  let extraTurnReason = null;

  if (wasKill) {
    extraTurnReason = "kill";
  } else if (diceValue === 6) {
    extraTurnReason = "six";
  }

  const backwardAllowed = wasKill
    ? false
    : true;

  return {
    extraTurn,
    extraTurnReason,
    backwardAllowed,
  };
};


// ============================================================
// PREPARE EXTRA TURN
// ============================================================
//
// This starts the next roll for the SAME player.
//
// Important:
//
// The player does NOT change.
//
// But:
// - dice is reset
// - hasRolled becomes false
// - backwardAllowed is preserved
//
// The game engine decides backwardAllowed
// after the previous move.
//
// Example:
//
// 6 + forward  -> backwardAllowed = true
// 6 + backward -> backwardAllowed = false
// 6 + base     -> backwardAllowed = false
// kill         -> backwardAllowed = false
// ============================================================

export const prepareExtraTurn = ({
  turn,
  now = new Date(),
  timeoutMs = TURN_TIMEOUT_MS,
}) => {
  if (!turn) {
    return {
      success: false,
      reason: "Turn is required.",
      turn: null,
    };
  }

  if (!turn.extraTurn) {
    return {
      success: false,
      reason: "No extra turn is available.",
      turn,
    };
  }

  const { turnStartedAt, turnExpiresAt } = getTurnTimes({
    now,
    timeoutMs,
  });

  return {
    success: true,
    reason: null,

    turn: {
      ...turn,

      diceValue: null,

      hasRolled: false,

      // IMPORTANT:
      // Extra turn never allows backward movement.

      // The player is now using the extra roll.
      //
      // We keep extraTurn = true here so the game engine
      // knows this is still an extra-turn sequence.
      extraTurn: true,

      turnStartedAt,
      turnExpiresAt,
    },
  };
};


// ============================================================
// COMPLETE TURN
// ============================================================
//
// After a normal turn has been completed and there is no
// extra turn, move to the next player.
//
// ============================================================

export const completeTurn = ({
  players,
  turn,
  now = new Date(),
  timeoutMs = TURN_TIMEOUT_MS,
}) => {
  if (!Array.isArray(players) || players.length === 0) {
    return {
      success: false,
      reason: "Players are required.",
      turn: null,
    };
  }

  if (!turn || !turn.playerId) {
    return {
      success: false,
      reason: "Current player is required.",
      turn: null,
    };
  }

  const nextPlayer = getNextPlayer({
    players,
    currentPlayerId: turn.playerId,
  });

  if (!nextPlayer) {
    return {
      success: false,
      reason: "Next player could not be determined.",
      turn: null,
    };
  }

  return {
    success: true,
    reason: null,

    turn: startTurn({
      playerId: nextPlayer.userId,
      now,
      timeoutMs,
    }),
  };
};


// ============================================================
// FINISH EXTRA TURN
// ============================================================
//
// When the extra roll is completed and does NOT produce
// another extra turn, the next player gets the turn.
//
// ============================================================

export const finishTurn = ({
  players,
  turn,
  now = new Date(),
  timeoutMs = TURN_TIMEOUT_MS,
}) => {
  if (!turn) {
    return {
      success: false,
      reason: "Turn is required.",
      turn: null,
    };
  }

  return completeTurn({
    players,
    turn,
    now,
    timeoutMs,
  });
};


// ============================================================
// CHECK TURN TIMEOUT
// ============================================================

export const isTurnExpired = ({
  turn,
  now = new Date(),
}) => {
  if (!turn || !turn.turnExpiresAt) {
    return false;
  }

  return new Date(now).getTime() >=
    new Date(turn.turnExpiresAt).getTime();
};


// ============================================================
// GET TIME REMAINING
// ============================================================

export const getTurnTimeRemaining = ({
  turn,
  now = new Date(),
}) => {
  if (!turn || !turn.turnExpiresAt) {
    return 0;
  }

  const remaining =
    new Date(turn.turnExpiresAt).getTime() -
    new Date(now).getTime();

  return Math.max(0, remaining);
};


// ============================================================
// CHECK WHETHER PLAYER CAN ROLL
// ============================================================

export const canRollDice = (turn) => {
  if (!turn) {
    return false;
  }

  return turn.hasRolled === false;
};


// ============================================================
// CHECK WHETHER PLAYER CAN MOVE
// ============================================================

export const canMoveCoin = (turn) => {
  if (!turn) {
    return false;
  }

  return (
    turn.hasRolled === true &&
    isValidDiceValue(turn.diceValue)
  );
};


// ============================================================
// CHECK WHETHER BACKWARD MOVEMENT IS CURRENTLY ALLOWED
// ============================================================

export const canMoveBackward = (turn) => {
  if (!turn) {
    return false;
  }

  return (
    canMoveCoin(turn) &&
    turn.backwardAllowed === true
  );
};


// ============================================================
// EXPORT DEFAULT OBJECT
// ============================================================

export default {
  TURN_TIMEOUT_MS,
  createInitialTurn,
  getNextPlayerIndex,
  getNextPlayer,
  getTurnTimes,
  startTurn,
  processDiceRoll,
  processKill,
  determineExtraTurn,
  prepareExtraTurn,
  completeTurn,
  finishTurn,
  isTurnExpired,
  getTurnTimeRemaining,
  canRollDice,
  canMoveCoin,
  canMoveBackward,
};