import {
  STANDARD_BOARD,
  FIVE_PLAYER_BOARD,
  SIX_PLAYER_BOARD,
  getBoardType,
  getBoardConfig,
  getActiveColors,
  getPlayerBoardInfo,
  isSafeCell,
  isValidColor,
} from "../../services/game/boardConfig.js";


// ============================================================
// TEST HELPERS
// ============================================================

let passed = 0;
let failed = 0;

const test = (name, condition) => {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    failed++;
  }
};


// ============================================================
// 1. BOARD TYPE TESTS
// ============================================================

console.log("\n========== BOARD TYPE TESTS ==========\n");

test(
  "2 players use standard-4 board",
  getBoardType(2) === "standard-4"
);

test(
  "3 players use standard-4 board",
  getBoardType(3) === "standard-4"
);

test(
  "4 players use standard-4 board",
  getBoardType(4) === "standard-4"
);

test(
  "5 players use five-player board",
  getBoardType(5) === "five-player"
);

test(
  "6 players use six-player board",
  getBoardType(6) === "six-player"
);

test(
  "7 players are not supported",
  getBoardType(7) === null
);


// ============================================================
// 2. STANDARD BOARD TESTS
// ============================================================

console.log("\n========== STANDARD BOARD TESTS ==========\n");

test(
  "Standard board has 52 track cells",
  STANDARD_BOARD.trackSize === 52
);

test(
  "Standard board has 4 colors",
  STANDARD_BOARD.colors.length === 4
);

test(
  "Standard board has 4 coins per player",
  STANDARD_BOARD.coinsPerPlayer === 4
);

test(
  "Standard board has 5 home cells",
  STANDARD_BOARD.homePathSize === 5
);

test(
  "Standard red start is cell 0",
  STANDARD_BOARD.startCells.red === 0
);

test(
  "Standard green start is cell 13",
  STANDARD_BOARD.startCells.green === 13
);

test(
  "Standard yellow start is cell 26",
  STANDARD_BOARD.startCells.yellow === 26
);

test(
  "Standard blue start is cell 39",
  STANDARD_BOARD.startCells.blue === 39
);


// ============================================================
// 3. FIVE PLAYER BOARD TESTS
// ============================================================

console.log("\n========== 5 PLAYER BOARD TESTS ==========\n");

test(
  "5-player board has 60 track cells",
  FIVE_PLAYER_BOARD.trackSize === 60
);

test(
  "5-player board has 5 colors",
  FIVE_PLAYER_BOARD.colors.length === 5
);

test(
  "5-player board has 4 coins per player",
  FIVE_PLAYER_BOARD.coinsPerPlayer === 4
);

test(
  "5-player board has 5 home cells",
  FIVE_PLAYER_BOARD.homePathSize === 5
);

test(
  "5-player red starts at 0",
  FIVE_PLAYER_BOARD.startCells.red === 0
);

test(
  "5-player green starts at 12",
  FIVE_PLAYER_BOARD.startCells.green === 12
);

test(
  "5-player yellow starts at 24",
  FIVE_PLAYER_BOARD.startCells.yellow === 24
);

test(
  "5-player blue starts at 36",
  FIVE_PLAYER_BOARD.startCells.blue === 36
);

test(
  "5-player orange starts at 48",
  FIVE_PLAYER_BOARD.startCells.orange === 48
);


// ============================================================
// 4. SIX PLAYER BOARD TESTS
// ============================================================

console.log("\n========== 6 PLAYER BOARD TESTS ==========\n");

test(
  "6-player board has 72 track cells",
  SIX_PLAYER_BOARD.trackSize === 72
);

test(
  "6-player board has 6 colors",
  SIX_PLAYER_BOARD.colors.length === 6
);

test(
  "6-player board has 4 coins per player",
  SIX_PLAYER_BOARD.coinsPerPlayer === 4
);

test(
  "6-player board has 5 home cells",
  SIX_PLAYER_BOARD.homePathSize === 5
);

test(
  "6-player red starts at 0",
  SIX_PLAYER_BOARD.startCells.red === 0
);

test(
  "6-player green starts at 12",
  SIX_PLAYER_BOARD.startCells.green === 12
);

test(
  "6-player orange starts at 24",
  SIX_PLAYER_BOARD.startCells.orange === 24
);

test(
  "6-player blue starts at 36",
  SIX_PLAYER_BOARD.startCells.blue === 36
);

test(
  "6-player yellow starts at 48",
  SIX_PLAYER_BOARD.startCells.yellow === 48
);

test(
  "6-player purple starts at 60",
  SIX_PLAYER_BOARD.startCells.purple === 60
);


// ============================================================
// 5. ACTIVE COLOR TESTS
// ============================================================

console.log("\n========== ACTIVE COLOR TESTS ==========\n");

const colors2 = getActiveColors(2);
const colors3 = getActiveColors(3);
const colors4 = getActiveColors(4);
const colors5 = getActiveColors(5);
const colors6 = getActiveColors(6);

test(
  "2-player game has 2 active colors",
  colors2.length === 2
);

test(
  "3-player game has 3 active colors",
  colors3.length === 3
);

test(
  "4-player game has 4 active colors",
  colors4.length === 4
);

test(
  "5-player game has 5 active colors",
  colors5.length === 5
);

test(
  "6-player game has 6 active colors",
  colors6.length === 6
);

test(
  "2-player colors are red and green",
  colors2.join(",") === "red,green"
);

test(
  "3-player colors are red, green and yellow",
  colors3.join(",") === "red,green,yellow"
);

test(
  "4-player colors are red, green, yellow and blue",
  colors4.join(",") === "red,green,yellow,blue"
);


// ============================================================
// 6. PLAYER BOARD INFO TESTS
// ============================================================

console.log("\n========== PLAYER BOARD INFO TESTS ==========\n");

const redPlayer = getPlayerBoardInfo(4, "red");
const greenPlayer = getPlayerBoardInfo(4, "green");

test(
  "Red player information exists",
  redPlayer !== null
);

test(
  "Red player start cell is 0",
  redPlayer?.startCell === 0
);

test(
  "Red home entry cell is 51",
  redPlayer?.homeEntryCell === 51
);

test(
  "Green player start cell is 13",
  greenPlayer?.startCell === 13
);

test(
  "Invalid color returns null",
  getPlayerBoardInfo(4, "orange") === null
);


// ============================================================
// 7. SAFE CELL TESTS
// ============================================================

console.log("\n========== SAFE CELL TESTS ==========\n");

test(
  "Standard cell 0 is safe",
  isSafeCell(4, 0) === true
);

test(
  "Standard cell 8 is safe",
  isSafeCell(4, 8) === true
);

test(
  "Standard cell 13 is safe",
  isSafeCell(4, 13) === true
);

test(
  "Standard cell 5 is not safe",
  isSafeCell(4, 5) === false
);


// ============================================================
// 8. COLOR VALIDATION TESTS
// ============================================================

console.log("\n========== COLOR VALIDATION TESTS ==========\n");

test(
  "Red is valid for 4-player game",
  isValidColor(4, "red") === true
);

test(
  "Blue is valid for 4-player game",
  isValidColor(4, "blue") === true
);

test(
  "Orange is invalid for 4-player game",
  isValidColor(4, "orange") === false
);

test(
  "Orange is valid for 5-player game",
  isValidColor(5, "orange") === true
);

test(
  "Purple is valid for 6-player game",
  isValidColor(6, "purple") === true
);


// ============================================================
// FINAL RESULT
// ============================================================

console.log("\n========================================");
console.log(`Tests passed: ${passed}`);
console.log(`Tests failed: ${failed}`);
console.log("========================================\n");

if (failed > 0) {
  process.exit(1);
}

console.log("🎉 All board configuration tests passed!");