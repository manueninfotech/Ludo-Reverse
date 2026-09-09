// ============================================================
// REVERSE LUDO - MOVEMENT LOGIC
// ============================================================
//
// This file is responsible for calculating legal coin movement.
//
// It does NOT:
// - Roll dice
// - Kill opponents
// - Change turns
// - Give extra turns
// - Save to MongoDB
// - Decide the winner
//
// Those responsibilities will be handled separately.
//
// ============================================================

import { getBoardConfig } from "./boardConfig.js";


// ============================================================
// CONSTANTS
// ============================================================

const BASE_PROGRESS = -1;
const FINISHED_AREA = "finished";


// ============================================================
// GET COIN ABSOLUTE CELL
// ============================================================
//
// Converts a player's relative progress into the actual
// shared-track cell.
//
// Example:
//
// Red starts at 0
// progress 5 -> absolute cell 5
//
// Green starts at 13
// progress 5 -> absolute cell 18
//
// Yellow starts at 26
// progress 5 -> absolute cell 31
//
// Blue starts at 39
// progress 5 -> absolute cell 44
//
// This only applies while the coin is on the main track.
// ============================================================

export const getAbsoluteCell = (playerColor, progress, playerCount) => {
  const board = getBoardConfig(playerCount);

  if (!board) {
    return null;
  }

  // Coin is not on the shared main track
  if (progress < 0 || progress >= board.trackSize) {
    return null;
  }

  const startCell = board.startCells[playerColor];

  if (startCell === undefined) {
    return null;
  }

  return (startCell + progress) % board.trackSize;
};


// ============================================================
// GET MOVEMENT AREA
// ============================================================
//
// Determines where the coin will be after a movement.
//
// Returns:
// - base
// - main
// - home
// - finished
// ============================================================

export const getAreaFromProgress = (progress, playerCount) => {
  const board = getBoardConfig(playerCount);

  if (!board) {
    return null;
  }

  if (progress === BASE_PROGRESS) {
    return "base";
  }

  if (progress >= 0 && progress < board.trackSize) {
    return "main";
  }

  if (
    progress >= board.trackSize &&
    progress < board.finishPosition
  ) {
    return "home";
  }

  if (progress === board.finishPosition) {
    return FINISHED_AREA;
  }

  return null;
};


// ============================================================
// GET MOVEMENT RESULT
// ============================================================
//
// Calculates where a coin will end up if moved.
//
// direction:
// - "forward"
// - "backward"
//
// Returns null if the movement is illegal.
//
// ============================================================

export const calculateMovement = ({
  playerColor,
  playerCount,
  coin,
  diceValue,
  direction,
}) => {
  const board = getBoardConfig(playerCount);

  if (!board) {
    return {
      legal: false,
      reason: "Invalid player count.",
    };
  }

  // ----------------------------------------------------------
  // Validate player color
  // ----------------------------------------------------------

  if (!board.colors.includes(playerColor)) {
    return {
      legal: false,
      reason: "Invalid player color.",
    };
  }


  // ----------------------------------------------------------
  // Validate dice
  // ----------------------------------------------------------

  if (
    !Number.isInteger(diceValue) ||
    diceValue < 1 ||
    diceValue > 6
  ) {
    return {
      legal: false,
      reason: "Dice value must be between 1 and 6.",
    };
  }


  // ----------------------------------------------------------
  // Validate direction
  // ----------------------------------------------------------

  if (!["forward", "backward"].includes(direction)) {
    return {
      legal: false,
      reason: "Direction must be forward or backward.",
    };
  }


  // ----------------------------------------------------------
  // Validate coin
  // ----------------------------------------------------------

  if (!coin) {
    return {
      legal: false,
      reason: "Coin is required.",
    };
  }


  // ==========================================================
  // COIN IN BASE
  // ==========================================================

  if (coin.area === "base") {
    // A coin can only leave base when dice is 6.
    if (diceValue !== 6) {
      return {
        legal: false,
        reason: "A coin can leave base only when the dice is 6.",
      };
    }

    // A coin leaving base always moves forward.
    if (direction !== "forward") {
      return {
        legal: false,
        reason: "A coin in base cannot move backward.",
      };
    }

    const startCell = board.startCells[playerColor];

    return {
      legal: true,
      direction: "forward",
      fromArea: "base",
      toArea: "main",
      fromProgress: BASE_PROGRESS,
      toProgress: 0,
      fromAbsoluteCell: null,
      toAbsoluteCell: startCell,
      enteredBoard: true,
      enteredHome: false,
      finished: false,
    };
  }


  // ==========================================================
  // COIN ALREADY FINISHED
  // ==========================================================

  if (coin.area === FINISHED_AREA) {
    return {
      legal: false,
      reason: "A finished coin cannot move.",
    };
  }


  // ==========================================================
  // VALIDATE CURRENT PROGRESS
  // ==========================================================

  if (!Number.isInteger(coin.progress)) {
    return {
      legal: false,
      reason: "Coin progress is invalid.",
    };
  }


  // ==========================================================
  // COIN IN HOME PATH
  // ==========================================================

  if (coin.area === "home") {
    // Reverse movement is NOT allowed inside home path.
    if (direction !== "forward") {
      return {
        legal: false,
        reason: "Backward movement is not allowed in the home path.",
      };
    }

    const newProgress = coin.progress + diceValue;

    // Cannot move beyond the finish position.
    if (newProgress > board.finishPosition) {
      return {
        legal: false,
        reason: "Exact dice value is required to finish the coin.",
      };
    }

    const newArea =
      newProgress === board.finishPosition
        ? FINISHED_AREA
        : "home";

    return {
      legal: true,
      direction: "forward",
      fromArea: "home",
      toArea: newArea,
      fromProgress: coin.progress,
      toProgress: newProgress,
      fromAbsoluteCell: null,
      toAbsoluteCell: null,
      enteredBoard: false,
      enteredHome: false,
      finished: newArea === FINISHED_AREA,
    };
  }


  // ==========================================================
  // COIN ON MAIN TRACK
  // ==========================================================

  if (coin.area === "main") {

    // --------------------------------------------------------
    // FORWARD MOVEMENT
    // --------------------------------------------------------

    if (direction === "forward") {
      const newProgress = coin.progress + diceValue;

      // Cannot go beyond finish.
      if (newProgress > board.finishPosition) {
        return {
          legal: false,
          reason: "Exact dice value is required to finish the coin.",
        };
      }

      const newArea = getAreaFromProgress(
        newProgress,
        playerCount
      );

      const fromAbsoluteCell = getAbsoluteCell(
        playerColor,
        coin.progress,
        playerCount
      );

      const toAbsoluteCell = getAbsoluteCell(
        playerColor,
        newProgress,
        playerCount
      );

      return {
        legal: true,
        direction: "forward",
        fromArea: "main",
        toArea: newArea,
        fromProgress: coin.progress,
        toProgress: newProgress,
        fromAbsoluteCell,
        toAbsoluteCell,
        enteredBoard: false,
        enteredHome: newArea === "home",
        finished: newArea === FINISHED_AREA,
      };
    }


    // --------------------------------------------------------
    // BACKWARD MOVEMENT
    // --------------------------------------------------------

    if (direction === "backward") {
      const newProgress = coin.progress - diceValue;

      // ======================================================
      // IMPORTANT REVERSE LUDO RULE
      // ======================================================
      //
      // Progress 0 is the player's own starting cell.
      //
      // Therefore:
      //
      // 0 - anything < 0 -> INVALID
      //
      // 3 - 3 = 0 -> VALID
      //
      // 3 - 5 = -2 -> INVALID
      //
      // This prevents the coin from moving backward past
      // its OWN starting cell.
      // ======================================================

      if (newProgress < 0) {
        return {
          legal: false,
          reason:
            "Backward movement cannot pass the player's own starting cell.",
        };
      }

      const fromAbsoluteCell = getAbsoluteCell(
        playerColor,
        coin.progress,
        playerCount
      );

      const toAbsoluteCell = getAbsoluteCell(
        playerColor,
        newProgress,
        playerCount
      );

      return {
        legal: true,
        direction: "backward",
        fromArea: "main",
        toArea: "main",
        fromProgress: coin.progress,
        toProgress: newProgress,
        fromAbsoluteCell,
        toAbsoluteCell,
        enteredBoard: false,
        enteredHome: false,
        finished: false,
      };
    }
  }


  // ==========================================================
  // INVALID AREA
  // ==========================================================

  return {
    legal: false,
    reason: "Invalid coin area.",
  };
};


// ============================================================
// GET LEGAL DIRECTIONS
// ============================================================
//
// This function tells the frontend/backend which directions
// are currently possible for a particular coin.
//
// Example:
//
// [
//   "forward",
//   "backward"
// ]
//
// or:
//
// [
//   "forward"
// ]
//
// or:
//
// []
//
// ============================================================

export const getLegalDirections = ({
  playerColor,
  playerCount,
  coin,
  diceValue,
}) => {
  const directions = [];

  const forwardMove = calculateMovement({
    playerColor,
    playerCount,
    coin,
    diceValue,
    direction: "forward",
  });

  if (forwardMove.legal) {
    directions.push("forward");
  }

  const backwardMove = calculateMovement({
    playerColor,
    playerCount,
    coin,
    diceValue,
    direction: "backward",
  });

  if (backwardMove.legal) {
    directions.push("backward");
  }

  return directions;
};


// ============================================================
// CHECK WHETHER A COIN CAN MOVE
// ============================================================

export const canCoinMove = ({
  playerColor,
  playerCount,
  coin,
  diceValue,
}) => {
  const directions = getLegalDirections({
    playerColor,
    playerCount,
    coin,
    diceValue,
  });

  return directions.length > 0;
};

// ============================================================
// GET COMPLETE POSSIBLE MOVES FOR ALL COINS
// ============================================================
//
// Returns every legal movement available for the player's
// coins for the current dice value.
//
// Example:
//
// [
//   {
//     coinId: "user-1-coin-1",
//     direction: "forward",
//     ...
//   },
//   {
//     coinId: "user-1-coin-2",
//     direction: "forward",
//     ...
//   }
// ]
//
// ============================================================

export const getPossibleMoves = ({
  playerColor,
  playerCount,
  coins,
  diceValue,
  backwardAllowed = true,
}) => {
  const moves = [];

  if (!Array.isArray(coins)) {
    return moves;
  }

  for (const coin of coins) {
    const directions = getLegalDirections({
      playerColor,
      playerCount,
      coin,
      diceValue,
    });

    for (const direction of directions) {
      // Extra turns from 6 or kill do not allow backward movement.
      if (
        direction === "backward" &&
        backwardAllowed !== true
      ) {
        continue;
      }

      const movement = calculateMovement({
        playerColor,
        playerCount,
        coin,
        diceValue,
        direction,
      });

      if (movement.legal) {
        moves.push({
          ...movement,
          coinId: coin.coinId,
        });
      }
    }
  }

  return moves;
};