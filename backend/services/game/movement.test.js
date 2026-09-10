// ============================================================
// REVERSE LUDO - MOVEMENT TESTS
// ============================================================

import {
  getAbsoluteCell,
  getAreaFromProgress,
  calculateMovement,
  getLegalDirections,
  canCoinMove,
  getPossibleMoves,
} from "./movement.js";


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
// TEST COINS
// ============================================================

const baseCoin = {
  coinId: "red-1",
  area: "base",
  progress: -1,
  absoluteCell: null,
};

const mainCoin = (progress) => ({
  coinId: "red-1",
  area: "main",
  progress,
  absoluteCell: progress,
});

const homeCoin = (progress) => ({
  coinId: "red-1",
  area: "home",
  progress,
  absoluteCell: null,
});

const finishedCoin = {
  coinId: "red-1",
  area: "finished",
  progress: 56,
  absoluteCell: null,
};


// ============================================================
// 1. ABSOLUTE CELL TESTS
// ============================================================

console.log("\n========== ABSOLUTE CELL TESTS ==========\n");

test(
  "Red progress 0 maps to absolute cell 0",
  getAbsoluteCell("red", 0, 4) === 0
);

test(
  "Red progress 5 maps to absolute cell 5",
  getAbsoluteCell("red", 5, 4) === 5
);

test(
  "Green progress 0 maps to absolute cell 13",
  getAbsoluteCell("green", 0, 4) === 13
);

test(
  "Green progress 5 maps to absolute cell 18",
  getAbsoluteCell("green", 5, 4) === 18
);

test(
  "Yellow progress 5 maps to absolute cell 31",
  getAbsoluteCell("yellow", 5, 4) === 31
);

test(
  "Blue progress 5 maps to absolute cell 44",
  getAbsoluteCell("blue", 5, 4) === 44
);

test(
  "Progress outside main track returns null",
  getAbsoluteCell("red", 52, 4) === null
);


// ============================================================
// 2. AREA TESTS
// ============================================================

console.log("\n========== AREA TESTS ==========\n");

test(
  "Progress -1 is base",
  getAreaFromProgress(-1, 4) === "base"
);

test(
  "Progress 0 is main",
  getAreaFromProgress(0, 4) === "main"
);

test(
  "Progress 51 is home",
  getAreaFromProgress(51, 4, "red") === "home"
);

test(
  "Progress 52 is home",
  getAreaFromProgress(52, 4, "red") === "home"
);

test(
  "Progress 55 is home",
  getAreaFromProgress(55, 4, "red") === "home"
);

test(
  "Progress 56 is finished",
  getAreaFromProgress(56, 4, "red") === "finished"
);  


// ============================================================
// 3. BASE MOVEMENT TESTS
// ============================================================

console.log("\n========== BASE MOVEMENT TESTS ==========\n");

const baseForward = calculateMovement({
  playerColor: "red",
  playerCount: 4,
  coin: baseCoin,
  diceValue: 6,
  direction: "forward",
});

test(
  "Base coin can move with dice 6",
  baseForward.legal === true
);

test(
  "Base coin enters main track",
  baseForward.toArea === "main"
);

test(
  "Base coin enters at progress 0",
  baseForward.toProgress === 0
);

test(
  "Base coin enters red starting cell",
  baseForward.toAbsoluteCell === 0
);


const baseFive = calculateMovement({
  playerColor: "red",
  playerCount: 4,
  coin: baseCoin,
  diceValue: 5,
  direction: "forward",
});

test(
  "Base coin cannot move with dice other than 6",
  baseFive.legal === false
);


const baseBackward = calculateMovement({
  playerColor: "red",
  playerCount: 4,
  coin: baseCoin,
  diceValue: 6,
  direction: "backward",
});

test(
  "Base coin cannot move backward",
  baseBackward.legal === false
);


// ============================================================
// 4. FORWARD MOVEMENT TESTS
// ============================================================

console.log("\n========== FORWARD MOVEMENT TESTS ==========\n");

const forwardMove = calculateMovement({
  playerColor: "red",
  playerCount: 4,
  coin: mainCoin(5),
  diceValue: 3,
  direction: "forward",
});

test(
  "Main coin can move forward",
  forwardMove.legal === true
);

test(
  "Forward movement increases progress correctly",
  forwardMove.toProgress === 8
);

test(
  "Forward movement calculates absolute cell",
  forwardMove.toAbsoluteCell === 8
);

test(
  "Forward movement remains on main track",
  forwardMove.toArea === "main"
);


// ============================================================
// 5. BACKWARD MOVEMENT TESTS
// ============================================================

console.log("\n========== BACKWARD MOVEMENT TESTS ==========\n");

const backwardMove = calculateMovement({
  playerColor: "red",
  playerCount: 4,
  coin: mainCoin(10),
  diceValue: 3,
  direction: "backward",
});

test(
  "Main coin can move backward",
  backwardMove.legal === true
);

test(
  "Backward movement decreases progress correctly",
  backwardMove.toProgress === 7
);

test(
  "Backward movement calculates absolute cell",
  backwardMove.toAbsoluteCell === 7
);

test(
  "Backward movement remains on main track",
  backwardMove.toArea === "main"
);


// ============================================================
// 6. OWN STARTING CELL RULE
// ============================================================

console.log("\n========== OWN STARTING CELL TESTS ==========\n");

// Red starts at progress 0.
//
// Coin is 3 steps from its own starting cell.
// Dice = 3.
//
// It should be allowed to move exactly to progress 0.

const exactStartMove = calculateMovement({
  playerColor: "red",
  playerCount: 4,
  coin: mainCoin(3),
  diceValue: 3,
  direction: "backward",
});

test(
  "Coin can move backward exactly to own starting cell",
  exactStartMove.legal === true
);

test(
  "Coin lands exactly on own starting cell",
  exactStartMove.toProgress === 0
);

test(
  "Coin lands on red absolute starting cell",
  exactStartMove.toAbsoluteCell === 0
);


// Coin is 3 steps from start.
// Dice = 5.
//
// 3 - 5 = -2
//
// This must NOT be allowed.

const pastStartMove = calculateMovement({
  playerColor: "red",
  playerCount: 4,
  coin: mainCoin(3),
  diceValue: 5,
  direction: "backward",
});

test(
  "Coin cannot move backward past own starting cell",
  pastStartMove.legal === false
);


// Coin is exactly at starting cell.
// Any backward movement must be rejected.

const startBackward = calculateMovement({
  playerColor: "red",
  playerCount: 4,
  coin: mainCoin(0),
  diceValue: 1,
  direction: "backward",
});

test(
  "Coin at own starting cell cannot move backward",
  startBackward.legal === false
);


// ============================================================
// 7. HOME PATH TESTS
// ============================================================

console.log("\n========== HOME PATH TESTS ==========\n");

const enterHome = calculateMovement({
  playerColor: "red",
  playerCount: 4,
  coin: mainCoin(50),
  diceValue: 2,
  direction: "forward",
});

test(
  "Coin can enter home path",
  enterHome.legal === true
);

test(
  "Coin entering home has home area",
  enterHome.toArea === "home"
);

test(
  "Coin enters home at correct progress",
  enterHome.toProgress === 52
);


// ============================================================
// 8. BACKWARD FROM HOME
// ============================================================

console.log("\n========== BACKWARD HOME TESTS ==========\n");

const homeBackward = calculateMovement({
  playerColor: "red",
  playerCount: 4,
  coin: homeCoin(53),
  diceValue: 2,
  direction: "backward",
});

test(
  "Backward movement is not allowed in home path",
  homeBackward.legal === false
);


// ============================================================
// 9. HOME FORWARD MOVEMENT
// ============================================================

console.log("\n========== HOME FORWARD TESTS ==========\n");

const homeForward = calculateMovement({
  playerColor: "red",
  playerCount: 4,
  coin: homeCoin(53),
  diceValue: 2,
  direction: "forward",
});

test(
  "Home coin can move forward",
  homeForward.legal === true
);

test(
  "Home coin moves forward correctly",
  homeForward.toProgress === 55
);

test(
  "Home coin remains in home",
  homeForward.toArea === "home"
);


// ============================================================
// 10. EXACT FINISH
// ============================================================

console.log("\n========== FINISH TESTS ==========\n");

const exactFinish = calculateMovement({
  playerColor: "red",
  playerCount: 4,
  coin: homeCoin(55),
  diceValue: 1,
  direction: "forward",
});

test(
  "Coin can finish with exact dice value",
  exactFinish.legal === true
);

test(
  "Coin reaches finish position",
  exactFinish.toProgress === 56
);

test(
  "Coin becomes finished",
  exactFinish.toArea === "finished"
);

test(
  "Finished flag is true",
  exactFinish.finished === true
);


// ============================================================
// 11. OVERSHOOT FINISH
// ============================================================

console.log("\n========== OVERSHOOT TESTS ==========\n");

const overshootFinish = calculateMovement({
  playerColor: "red",
  playerCount: 4,
  coin: homeCoin(55),
  diceValue: 3,
  direction: "forward",
});

test(
  "Coin cannot overshoot finish",
  overshootFinish.legal === false
);


// ============================================================
// 12. FINISHED COIN TEST
// ============================================================

console.log("\n========== FINISHED COIN TESTS ==========\n");

const finishedMove = calculateMovement({
  playerColor: "red",
  playerCount: 4,
  coin: finishedCoin,
  diceValue: 3,
  direction: "forward",
});

test(
  "Finished coin cannot move",
  finishedMove.legal === false
);


// ============================================================
// 13. LEGAL DIRECTIONS
// ============================================================

console.log("\n========== LEGAL DIRECTION TESTS ==========\n");

const directionsMain = getLegalDirections({
  playerColor: "red",
  playerCount: 4,
  coin: mainCoin(10),
  diceValue: 3,
});

test(
  "Main-track coin has forward direction",
  directionsMain.includes("forward")
);

test(
  "Main-track coin has backward direction",
  directionsMain.includes("backward")
);

test(
  "Main-track coin has two legal directions",
  directionsMain.length === 2
);


const directionsBase = getLegalDirections({
  playerColor: "red",
  playerCount: 4,
  coin: baseCoin,
  diceValue: 6,
});

test(
  "Base coin has forward direction",
  directionsBase.includes("forward")
);

test(
  "Base coin does not have backward direction",
  !directionsBase.includes("backward")
);


// ============================================================
// 14. CAN COIN MOVE
// ============================================================

console.log("\n========== CAN COIN MOVE TESTS ==========\n");

test(
  "Main coin can move",
  canCoinMove({
    playerColor: "red",
    playerCount: 4,
    coin: mainCoin(10),
    diceValue: 3,
  }) === true
);

test(
  "Base coin can move with six",
  canCoinMove({
    playerColor: "red",
    playerCount: 4,
    coin: baseCoin,
    diceValue: 6,
  }) === true
);

test(
  "Base coin cannot move with five",
  canCoinMove({
    playerColor: "red",
    playerCount: 4,
    coin: baseCoin,
    diceValue: 5,
  }) === false
);

test(
  "Finished coin cannot move",
  canCoinMove({
    playerColor: "red",
    playerCount: 4,
    coin: finishedCoin,
    diceValue: 6,
  }) === false
);


// ============================================================
// 15. COMPLETE POSSIBLE MOVES
// ============================================================

console.log("\n========== POSSIBLE MOVES TESTS ==========\n");

const possibleMoves = getPossibleMoves({
  playerColor: "red",
  playerCount: 4,
  coins: [mainCoin(10)],
  diceValue: 3,
});

test(
  "Possible moves are returned",
  Array.isArray(possibleMoves)
);

test(
  "Main coin has two possible moves",
  possibleMoves.length === 2
);

test(
  "Forward move is included",
  possibleMoves.some(
    (move) => move.direction === "forward"
  )
);

test(
  "Backward move is included",
  possibleMoves.some(
    (move) => move.direction === "backward"
  )
);


// ============================================================
// 16. 3-PLAYER STANDARD BOARD
// ============================================================

console.log("\n========== 3 PLAYER BOARD TESTS ==========\n");

const greenThreePlayerMove = calculateMovement({
  playerColor: "green",
  playerCount: 3,
  coin: {
    coinId: "green-1",
    area: "main",
    progress: 5,
    absoluteCell: 18,
  },
  diceValue: 2,
  direction: "forward",
});

test(
  "3-player game uses standard board movement",
  greenThreePlayerMove.legal === true
);

test(
  "3-player green absolute cell is calculated correctly",
  greenThreePlayerMove.toAbsoluteCell === 20
);


// ============================================================
// 17. 5-PLAYER BOARD
// ============================================================

console.log("\n========== 5 PLAYER BOARD TESTS ==========\n");

const fivePlayerMove = calculateMovement({
  playerColor: "orange",
  playerCount: 5,
  coin: {
    coinId: "orange-1",
    area: "main",
    progress: 5,
    absoluteCell: 53,
  },
  diceValue: 3,
  direction: "forward",
});

test(
  "5-player movement is supported",
  fivePlayerMove.legal === true
);

test(
  "5-player orange movement calculates correctly",
  fivePlayerMove.toProgress === 8
);

test(
  "5-player orange absolute cell is calculated correctly",
  fivePlayerMove.toAbsoluteCell === 56
);


// ============================================================
// 18. 6-PLAYER BOARD
// ============================================================

console.log("\n========== 6 PLAYER BOARD TESTS ==========\n");

const sixPlayerMove = calculateMovement({
  playerColor: "purple",
  playerCount: 6,
  coin: {
    coinId: "purple-1",
    area: "main",
    progress: 5,
    absoluteCell: 65,
  },
  diceValue: 3,
  direction: "forward",
});

test(
  "6-player movement is supported",
  sixPlayerMove.legal === true
);

test(
  "6-player purple movement calculates correctly",
  sixPlayerMove.toProgress === 8
);

test(
  "6-player purple absolute cell is calculated correctly",
  sixPlayerMove.toAbsoluteCell === 68
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

console.log("🎉 All movement tests passed!");