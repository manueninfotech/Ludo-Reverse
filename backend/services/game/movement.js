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
// ============================================================

import { getBoardConfig } from "./boardConfig.js";

// ============================================================
// CONSTANTS
// ============================================================

const BASE_PROGRESS = -1;
const FINISHED_AREA = "finished";

// ============================================================
// GET HOME ENTRY PROGRESS
// ============================================================
//
// Converts the player's absolute home-entry cell into
// the player's relative progress.
//
// Example - standard 4-player Green:
//
// start = 13
// homeEntry = 11
//
// (11 - 13 + 52) % 52
// = 50
//
// Therefore:
//
// progress 50 = absolute cell 11
// progress 51 = first home cell
//
// ============================================================

const getHomeEntryProgress = (
  playerColor,
  playerCount
) => {
  const board =
    getBoardConfig(playerCount);

  if (!board) {
    return null;
  }

  const startCell =
    board.startCells[playerColor];

  const homeEntryCell =
    board.homeEntryCells[playerColor];

  if (
    startCell === undefined ||
    homeEntryCell === undefined
  ) {
    return null;
  }

  return (
    homeEntryCell -
    startCell +
    board.trackSize
  ) % board.trackSize;
};

// ============================================================
// GET COIN ABSOLUTE CELL
// ============================================================
//
// Only coins on the shared main track have an absolute cell.
//
// Important:
// A progress value beyond the player's home-entry progress
// is already inside the private home path.
//
// ============================================================

export const getAbsoluteCell = (
  playerColor,
  progress,
  playerCount
) => {
  const board =
    getBoardConfig(playerCount);

  if (!board) {
    return null;
  }

  const homeEntryProgress =
    getHomeEntryProgress(
      playerColor,
      playerCount
    );

  if (
    homeEntryProgress === null
  ) {
    return null;
  }

  // Outside shared track.
  if (
    progress < 0 ||
    progress > homeEntryProgress
  ) {
    return null;
  }

  const startCell =
    board.startCells[playerColor];

  if (
    startCell === undefined
  ) {
    return null;
  }

  return (
    startCell + progress
  ) % board.trackSize;
};

// ============================================================
// GET MOVEMENT AREA
// ============================================================
//
// Main track:
// 0 .. homeEntryProgress
//
// Home:
// homeEntryProgress + 1 .. finishPosition - 1
//
// Finished:
// finishPosition
//
// ============================================================

export const getAreaFromProgress = (
  progress,
  playerCount,
  playerColor = null
) => {
  const board =
    getBoardConfig(playerCount);

  if (!board) {
    return null;
  }

  if (
    progress ===
    BASE_PROGRESS
  ) {
    return "base";
  }

  // ----------------------------------------------------------
  // Determine home-entry progress.
  // ----------------------------------------------------------
  //
  // Normally playerColor is supplied.
  // The fallback below preserves compatibility with older
  // callers that only check area ranges.
  //
  // For actual movement, playerColor is always supplied.
  // ----------------------------------------------------------

  if (playerColor) {
    const homeEntryProgress =
      getHomeEntryProgress(
        playerColor,
        playerCount
      );

    if (
      homeEntryProgress === null
    ) {
      return null;
    }

    if (
      progress >= 0 &&
      progress <= homeEntryProgress
    ) {
      return "main";
    }

    if (
      progress >
        homeEntryProgress &&
      progress <
        board.finishPosition
    ) {
      return "home";
    }

    if (
      progress ===
      board.finishPosition
    ) {
      return FINISHED_AREA;
    }

    return null;
  }

  // ----------------------------------------------------------
  // Backward-compatible fallback.
  // ----------------------------------------------------------

  if (
    progress >= 0 &&
    progress < board.trackSize
  ) {
    return "main";
  }

  if (
    progress >= board.trackSize &&
    progress < board.finishPosition
  ) {
    return "home";
  }

  if (
    progress ===
    board.finishPosition
  ) {
    return FINISHED_AREA;
  }

  return null;
};

// ============================================================
// GET FORWARD TARGET PROGRESS
// ============================================================
//
// This is the important Reverse Ludo home-entry logic.
//
// Example - Green:
//
// homeEntryProgress = 50
//
// current = 50
// dice = 1
//
// target = 51
// => first Green home cell
//
// current = 49
// dice = 3
//
// target = 52
// => second Green home cell
//
// ============================================================

const getForwardTargetProgress = ({
  playerColor,
  playerCount,
  currentProgress,
  diceValue,
}) => {
  const board =
    getBoardConfig(playerCount);

  if (!board) {
    return null;
  }

  const homeEntryProgress =
    getHomeEntryProgress(
      playerColor,
      playerCount
    );

  if (
    homeEntryProgress === null
  ) {
    return null;
  }

  const targetProgress =
    currentProgress +
    diceValue;

  // Still on shared main track.
  if (
    targetProgress <=
    homeEntryProgress
  ) {
    return {
      progress: targetProgress,
      entersHome: false,
    };
  }

  // Passed the last shared-track cell.
  //
  // The remaining movement continues inside
  // the player's private home path.
  return {
    progress: targetProgress,
    entersHome: true,
  };
};

// ============================================================
// CALCULATE MOVEMENT
// ============================================================

export const calculateMovement = ({
  playerColor,
  playerCount,
  coin,
  diceValue,
  direction,
}) => {
  const board =
    getBoardConfig(playerCount);

  if (!board) {
    return {
      legal: false,
      reason:
        "Invalid player count.",
    };
  }

  // ==========================================================
  // VALIDATE PLAYER COLOR
  // ==========================================================

  if (
    !board.colors.includes(
      playerColor
    )
  ) {
    return {
      legal: false,
      reason:
        "Invalid player color.",
    };
  }

  // ==========================================================
  // VALIDATE DICE
  // ==========================================================

  if (
    !Number.isInteger(
      diceValue
    ) ||
    diceValue < 1 ||
    diceValue > 6
  ) {
    return {
      legal: false,
      reason:
        "Dice value must be between 1 and 6.",
    };
  }

  // ==========================================================
  // VALIDATE DIRECTION
  // ==========================================================

  if (
    ![
      "forward",
      "backward",
    ].includes(direction)
  ) {
    return {
      legal: false,
      reason:
        "Direction must be forward or backward.",
    };
  }

  // ==========================================================
  // VALIDATE COIN
  // ==========================================================

  if (!coin) {
    return {
      legal: false,
      reason:
        "Coin is required.",
    };
  }

  // ==========================================================
  // COIN IN BASE
  // ==========================================================

  if (
    coin.area === "base"
  ) {
    if (
      diceValue !== 6
    ) {
      return {
        legal: false,
        reason:
          "A coin can leave base only when the dice is 6.",
      };
    }

    if (
      direction !== "forward"
    ) {
      return {
        legal: false,
        reason:
          "A coin in base cannot move backward.",
      };
    }

    const startCell =
      board.startCells[playerColor];

    return {
      legal: true,

      direction: "forward",

      fromArea: "base",
      toArea: "main",

      fromProgress:
        BASE_PROGRESS,

      toProgress: 0,

      fromAbsoluteCell: null,
      toAbsoluteCell:
        startCell,

      enteredBoard: true,
      enteredHome: false,
      finished: false,
    };
  }

  // ==========================================================
  // FINISHED COIN
  // ==========================================================

  if (
    coin.area ===
    FINISHED_AREA
  ) {
    return {
      legal: false,
      reason:
        "A finished coin cannot move.",
    };
  }

  // ==========================================================
  // VALIDATE PROGRESS
  // ==========================================================

  if (
    !Number.isInteger(
      coin.progress
    )
  ) {
    return {
      legal: false,
      reason:
        "Coin progress is invalid.",
    };
  }

  // ==========================================================
  // COIN IN HOME
  // ==========================================================

  if (
    coin.area === "home"
  ) {
    if (
      direction !== "forward"
    ) {
      return {
        legal: false,
        reason:
          "Backward movement is not allowed in the home path.",
      };
    }

    const newProgress =
      coin.progress +
      diceValue;

    if (
      newProgress >
      board.finishPosition
    ) {
      return {
        legal: false,
        reason:
          "Exact dice value is required to finish the coin.",
      };
    }

    const newArea =
      newProgress ===
      board.finishPosition
        ? FINISHED_AREA
        : "home";

    return {
      legal: true,

      direction: "forward",

      fromArea: "home",
      toArea: newArea,

      fromProgress:
        coin.progress,

      toProgress:
        newProgress,

      fromAbsoluteCell: null,
      toAbsoluteCell: null,

      enteredBoard: false,
      enteredHome: false,

      finished:
        newArea ===
        FINISHED_AREA,
    };
  }

  // ==========================================================
  // COIN ON MAIN TRACK
  // ==========================================================

  if (
    coin.area === "main"
  ) {
    const homeEntryProgress =
      getHomeEntryProgress(
        playerColor,
        playerCount
      );

    if (
      homeEntryProgress === null
    ) {
      return {
        legal: false,
        reason:
          "Unable to determine home entry.",
      };
    }

    // ========================================================
    // FORWARD
    // ========================================================

    if (
      direction === "forward"
    ) {
      const movement =
        getForwardTargetProgress({
          playerColor,
          playerCount,
          currentProgress:
            coin.progress,
          diceValue,
        });

      if (!movement) {
        return {
          legal: false,
          reason:
            "Unable to calculate forward movement.",
        };
      }

      const newProgress =
        movement.progress;

      if (
        newProgress >
        board.finishPosition
      ) {
        return {
          legal: false,
          reason:
            "Exact dice value is required to finish the coin.",
        };
      }

      const newArea =
        newProgress <=
        homeEntryProgress
          ? "main"
          : newProgress ===
            board.finishPosition
          ? FINISHED_AREA
          : "home";

      const fromAbsoluteCell =
        getAbsoluteCell(
          playerColor,
          coin.progress,
          playerCount
        );

      const toAbsoluteCell =
        newArea === "main"
          ? getAbsoluteCell(
              playerColor,
              newProgress,
              playerCount
            )
          : null;

      return {
        legal: true,

        direction: "forward",

        fromArea: "main",
        toArea: newArea,

        fromProgress:
          coin.progress,

        toProgress:
          newProgress,

        fromAbsoluteCell,
        toAbsoluteCell,

        enteredBoard: false,

        enteredHome:
          newArea === "home" ||
          newArea ===
            FINISHED_AREA,

        finished:
          newArea ===
          FINISHED_AREA,
      };
    }

    // ========================================================
    // BACKWARD
    // ========================================================

    if (
      direction === "backward"
    ) {
      const newProgress =
        coin.progress -
        diceValue;

      // Cannot go below own starting position.
      if (
        newProgress < 0
      ) {
        return {
          legal: false,
          reason:
            "Backward movement cannot pass the player's own starting cell.",
        };
      }

      const fromAbsoluteCell =
        getAbsoluteCell(
          playerColor,
          coin.progress,
          playerCount
        );

      const toAbsoluteCell =
        getAbsoluteCell(
          playerColor,
          newProgress,
          playerCount
        );

      return {
        legal: true,

        direction: "backward",

        fromArea: "main",
        toArea: "main",

        fromProgress:
          coin.progress,

        toProgress:
          newProgress,

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
    reason:
      "Invalid coin area.",
  };
};

// ============================================================
// GET LEGAL DIRECTIONS
// ============================================================

export const getLegalDirections = ({
  playerColor,
  playerCount,
  coin,
  diceValue,
}) => {
  const directions = [];

  const forwardMove =
    calculateMovement({
      playerColor,
      playerCount,
      coin,
      diceValue,
      direction:
        "forward",
    });

  if (
    forwardMove.legal
  ) {
    directions.push(
      "forward"
    );
  }

  const backwardMove =
    calculateMovement({
      playerColor,
      playerCount,
      coin,
      diceValue,
      direction:
        "backward",
    });

  if (
    backwardMove.legal
  ) {
    directions.push(
      "backward"
    );
  }

  return directions;
};

// ============================================================
// CAN COIN MOVE
// ============================================================

export const canCoinMove = ({
  playerColor,
  playerCount,
  coin,
  diceValue,
}) => {
  const directions =
    getLegalDirections({
      playerColor,
      playerCount,
      coin,
      diceValue,
    });

  return (
    directions.length > 0
  );
};

// ============================================================
// GET POSSIBLE MOVES
// ============================================================

export const getPossibleMoves = ({
  playerColor,
  playerCount,
  coins,
  diceValue,
  backwardAllowed = true,
}) => {
  const moves = [];

  if (
    !Array.isArray(coins)
  ) {
    return moves;
  }

  for (
    const coin of coins
  ) {
    const directions =
      getLegalDirections({
        playerColor,
        playerCount,
        coin,
        diceValue,
      });

    for (
      const direction of directions
    ) {

      if (
        direction ===
          "backward" &&
        backwardAllowed !== true
      ) {
        continue;
      }

      const movement =
        calculateMovement({
          playerColor,
          playerCount,
          coin,
          diceValue,
          direction,
        });

      if (
        movement.legal
      ) {
        moves.push({
          ...movement,
          coinId:
            coin.coinId,
        });
      }
    }
  }

  return moves;
};