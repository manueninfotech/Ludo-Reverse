// ============================================================
// LUDO BOARD CONFIGURATIONS - REVERSE LUDO
// ============================================================
//
// Important concepts:
//
// - Track cells are numbered clockwise from 0.
// - Each player has a starting cell on the main track.
// - Each player has a home-entry cell.
// - Home-entry cell = last main-track cell before entering
//   that player's private home path.
// - Home path contains 5 cells.
// - A coin finishes after reaching the final home position.
// - Forward movement is allowed normally.
// - Backward movement is allowed only when the coin is
//   on the main track.
// - A player cannot move backward past their OWN starting cell.
// - A coin can move backward TO its own starting cell.
// - Other safe/star cells are bidirectional.
// - Safe cells cannot be used to kill an opponent.
// - Every player has exactly 4 coins.
//
// Player modes:
//
// 2 players -> Standard 4-color board
// 3 players -> Standard 4-color board
// 4 players -> Standard 4-color board
// 5 players -> 5-color board
// 6 players -> 6-color board
//
// ============================================================


// ============================================================
// STANDARD 4-COLOR BOARD
// Used for 2, 3 and 4 players
// ============================================================

const STANDARD_BOARD = {
  type: "standard-4",

  // Number of cells on the shared circular track
  // Cells: 0 - 51
  trackSize: 52,

  // Available colors on the board
  colors: [
    "red",
    "green",
    "yellow",
    "blue",
  ],

  // Starting cell of each player
  startCells: {
  green: 0,
  yellow: 13,
  blue: 26,
  red: 39,
},


  // Last shared-track cell before entering
  // the player's private home path
  homeEntryCells: {
  green: 50,
  yellow: 11,
  blue: 24,
  red: 37,
},

  // Standard Ludo safe/star cells
  safeCells: [
    0,
    8,
    13,
    21,
    26,
    34,
    39,
    47,
  ],

  // Number of cells inside the private home path
  homePathSize: 5,

  // Progress value when the coin is finished
  // 52-56 = home path
  // 57 = finished
  finishPosition: 56,

  // Every player has 4 coins
  coinsPerPlayer: 4,
};


// ============================================================
// 5-PLAYER BOARD
// ============================================================
//
// Board layout:
// Red -> Green -> Yellow -> Blue -> Orange
//
// Main track:
// 60 cells
// 0 - 59
//
// Each player has:
// 1 starting cell
// 1 home entry
// 5 home cells
// 4 coins
// ============================================================

const FIVE_PLAYER_BOARD = {
  type: "five-player",

  // Main circular track
  // Cells: 0 - 59
  trackSize: 60,

  // Clockwise player/color order
  colors: [
    "red",
    "green",
    "yellow",
    "blue",
    "orange",
  ],

  // Starting cells
  startCells: {
    red: 0,
    green: 12,
    yellow: 24,
    blue: 36,
    orange: 48,
  },

  // Last main-track cell before entering home path
  homeEntryCells: {
    red: 59,
    green: 11,
    yellow: 23,
    blue: 35,
    orange: 47,
  },

  // Safe/star cells
  safeCells: [
    0,
    10,
    12,
    22,
    24,
    34,
    36,
    46,
    48,
    58,
  ],

  // Private home path
  homePathSize: 5,

  // 60 main-track cells + 5 home cells
  // = 65 progress value for finished
  finishPosition: 65,

  coinsPerPlayer: 4,
};


// ============================================================
// 6-PLAYER BOARD
// ============================================================
//
// Board layout:
// Red -> Green -> Orange -> Blue -> Yellow -> Purple
//
// Main track:
// 72 cells
// 0 - 71
//
// Each player has:
// 1 starting cell
// 1 home entry
// 5 home cells
// 4 coins
// ============================================================

const SIX_PLAYER_BOARD = {
  type: "six-player",

  // Main circular track
  // Cells: 0 - 71
  trackSize: 72,

  // Clockwise player/color order
  colors: [
    "red",
    "green",
    "orange",
    "blue",
    "yellow",
    "purple",
  ],

  // Starting cells
  startCells: {
    red: 0,
    green: 12,
    orange: 24,
    blue: 36,
    yellow: 48,
    purple: 60,
  },

  // Last main-track cell before entering home path
  homeEntryCells: {
    red: 71,
    green: 11,
    orange: 23,
    blue: 35,
    yellow: 47,
    purple: 59,
  },

  // Safe/star cells
  safeCells: [
    0,
    12,
    24,
    36,
    48,
    60,
  ],

  // Private home path
  homePathSize: 5,

  // 72 main-track cells + 5 home cells
  // = 77 progress value for finished
  finishPosition: 77,

  coinsPerPlayer: 4,
};


// ============================================================
// 7-PLAYER BOARD
// ============================================================
//
// Board layout:
// Red -> Green -> Orange -> Blue -> Yellow -> Purple -> Pink
//
// Main track:
// 84 cells
// 0 - 83
//
// Each player gets:
// 1 starting cell
// 1 home entry
// 5 home cells
// 4 coins
// ============================================================

const SEVEN_PLAYER_BOARD = {
  type: "seven-player",

  trackSize: 84,

  colors: [
    "red",
    "green",
    "orange",
    "blue",
    "yellow",
    "purple",
    "pink",
  ],

  startCells: {
    red: 0,
    green: 12,
    orange: 24,
    blue: 36,
    yellow: 48,
    purple: 60,
    pink: 72,
  },

  homeEntryCells: {
    red: 83,
    green: 11,
    orange: 23,
    blue: 35,
    yellow: 47,
    purple: 59,
    pink: 71,
  },

  safeCells: [
    0,
    12,
    24,
    36,
    48,
    60,
    72,
  ],

  homePathSize: 5,

  finishPosition: 89,

  coinsPerPlayer: 4,
};


// ============================================================
// 8-PLAYER BOARD
// ============================================================
//
// Board layout:
// Red -> Green -> Orange -> Blue -> Yellow -> Purple
// -> Pink -> Cyan
//
// Main track:
// 96 cells
// 0 - 95
//
// Each player gets:
// 1 starting cell
// 1 home entry
// 5 home cells
// 4 coins
// ============================================================

const EIGHT_PLAYER_BOARD = {
  type: "eight-player",

  trackSize: 96,

  colors: [
    "red",
    "green",
    "orange",
    "blue",
    "yellow",
    "purple",
    "pink",
    "white",
    "cyan",
  ],

  startCells: {
    red: 0,
    green: 12,
    orange: 24,
    blue: 36,
    yellow: 48,
    purple: 60,
    pink: 72,
    white: 84,
    cyan: 84,
  },

  homeEntryCells: {
    red: 95,
    green: 11,
    orange: 23,
    blue: 35,
    yellow: 47,
    purple: 59,
    pink: 71,
    white: 83,
    cyan: 83,
  },

  safeCells: [
    0,
    12,
    24,
    36,
    48,
    60,
    72,
    84,
  ],

  homePathSize: 5,

  finishPosition: 101,

  coinsPerPlayer: 4,
};


// ============================================================
// BOARD TYPE MAPPING
// ============================================================
//
// 2, 3 and 4 players use the same standard 4-color board.
//
// 5 players use the 5-color board.
//
// 6 players use the 6-color board.
// ============================================================

const BOARD_TYPES = {
  2: "standard-4",
  3: "standard-4",
  4: "standard-4",
  5: "five-player",
  6: "six-player",
  7: "seven-player",
  8: "eight-player",
};


// ============================================================
// GET BOARD TYPE BY PLAYER COUNT
// ============================================================

export const getBoardType = (playerCount) => {
  return BOARD_TYPES[playerCount] || null;
};


// ============================================================
// GET BOARD CONFIGURATION BY PLAYER COUNT
// ============================================================

export const getBoardConfig = (playerCount) => {
  const boardType = getBoardType(playerCount);

  if (!boardType) {
    return null;
  }

  switch (boardType) {
    case "standard-4":
      return STANDARD_BOARD;

    case "five-player":
      return FIVE_PLAYER_BOARD;

    case "six-player":
      return SIX_PLAYER_BOARD;

    case "seven-player":
      return SEVEN_PLAYER_BOARD;

    case "eight-player":
      return EIGHT_PLAYER_BOARD;

    default:
      return null;
  }
};


// ============================================================
// GET ACTIVE COLORS BY PLAYER COUNT
// ============================================================
//
// Standard board:
// 2 players -> red, green
// 3 players -> red, green, yellow
// 4 players -> red, green, yellow, blue
//
// 5 players -> all 5 colors
// 6 players -> all 6 colors
// ============================================================

export const getActiveColors = (playerCount) => {
  const board = getBoardConfig(playerCount);

  if (!board) {
    return [];
  }

  return board.colors.slice(0, playerCount);
};


// ============================================================
// GET PLAYER BOARD INFORMATION
// ============================================================
//
// Returns information needed when assigning a color
// to a player.
// ============================================================

export const getPlayerBoardInfo = (playerCount, color) => {
  const board = getBoardConfig(playerCount);

  if (!board) {
    return null;
  }

  if (!board.colors.includes(color)) {
    return null;
  }

  return {
    color,
    startCell: board.startCells[color],
    homeEntryCell: board.homeEntryCells[color],
  };
};


// ============================================================
// CHECK WHETHER A CELL IS SAFE
// ============================================================

export const isSafeCell = (playerCount, cell) => {
  const board = getBoardConfig(playerCount);

  if (!board) {
    return false;
  }

  return board.safeCells.includes(cell);
};


// ============================================================
// CHECK WHETHER A COLOR IS AVAILABLE FOR A GAME
// ============================================================

export const isValidColor = (playerCount, color) => {
  const board = getBoardConfig(playerCount);

  if (!board) {
    return false;
  }

  return board.colors.includes(color);
};


// ============================================================
// EXPORT BOARD CONFIGURATIONS
// ============================================================

export {
  STANDARD_BOARD,
  FIVE_PLAYER_BOARD,
  SIX_PLAYER_BOARD,
  SEVEN_PLAYER_BOARD,
  EIGHT_PLAYER_BOARD,
  BOARD_TYPES,
};