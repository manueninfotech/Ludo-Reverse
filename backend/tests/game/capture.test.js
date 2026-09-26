// ============================================================
// REVERSE LUDO - CAPTURE / KILL TESTS
// ============================================================
//
// These tests verify:
// - Coins can be found on shared cells
// - Forward kills are possible
// - Backward kills are possible
// - Safe cells protect coins
// - Own coins cannot be captured
// - Coins in base/home/finished cannot be captured
// - Killed coins return to base
// - Capture gives an extra turn
// - Multiple opponent coins are detected
//
// ============================================================

import {
  isCoinOnMainTrack,
  getCoinAbsoluteCell,
  isSafeCellForGame,
  findOpponentCoinsAtCell,
  canCapture,
  resetCoinToBase,
  captureOpponents,
  getCaptureResult,
  getsExtraTurnFromCapture,
  createCaptureEvent,
} from "../../services/game/capture.js";


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
// TEST PLAYER FACTORIES
// ============================================================

const createPlayer = ({
  userId,
  color,
  coins = [],
}) => ({
  userId,
  name: color,
  color,
  startCell: {
    red: 0,
    green: 13,
    yellow: 26,
    blue: 39,
  }[color],
  coins,
  isReady: true,
  isConnected: true,
});


const createMainCoin = ({
  coinId,
  progress,
}) => ({
  coinId,
  area: "main",
  progress,
  absoluteCell: progress,
});


const createBaseCoin = ({
  coinId,
}) => ({
  coinId,
  area: "base",
  progress: -1,
  absoluteCell: null,
});


const createHomeCoin = ({
  coinId,
  progress = 53,
}) => ({
  coinId,
  area: "home",
  progress,
  absoluteCell: null,
});


const createFinishedCoin = ({
  coinId,
}) => ({
  coinId,
  area: "finished",
  progress: 57,
  absoluteCell: null,
});


// ============================================================
// TEST PLAYERS
// ============================================================
//
// Red starts at absolute cell 0.
// Green starts at absolute cell 13.
//
// Red progress 5 -> absolute cell 5
// Green progress 5 -> absolute cell 18
//
// ============================================================

const redCoin = createMainCoin({
  coinId: "red-1",
  progress: 5,
});

const greenCoin = createMainCoin({
  coinId: "green-1",
  progress: 5,
});

const redPlayer = createPlayer({
  userId: "red-player",
  color: "red",
  coins: [redCoin],
});

const greenPlayer = createPlayer({
  userId: "green-player",
  color: "green",
  coins: [greenCoin],
});


// ============================================================
// 1. MAIN TRACK CHECKS
// ============================================================

console.log("\n========== MAIN TRACK TESTS ==========\n");

test(
  "Main-track coin is recognized",
  isCoinOnMainTrack(redCoin) === true
);

test(
  "Base coin is not on main track",
  isCoinOnMainTrack(createBaseCoin({
    coinId: "red-base",
  })) === false
);

test(
  "Home coin is not on main track",
  isCoinOnMainTrack(createHomeCoin({
    coinId: "red-home",
  })) === false
);

test(
  "Finished coin is not on main track",
  isCoinOnMainTrack(createFinishedCoin({
    coinId: "red-finished",
  })) === false
);


// ============================================================
// 2. ABSOLUTE CELL TESTS
// ============================================================

console.log("\n========== ABSOLUTE CELL TESTS ==========\n");

test(
  "Red progress 5 is absolute cell 5",
  getCoinAbsoluteCell({
    playerColor: "red",
    playerCount: 4,
    coin: redCoin,
  }) === 5
);

test(
  "Green progress 5 is absolute cell 18",
  getCoinAbsoluteCell({
    playerColor: "green",
    playerCount: 4,
    coin: greenCoin,
  }) === 18
);

test(
  "Base coin has no absolute cell",
  getCoinAbsoluteCell({
    playerColor: "red",
    playerCount: 4,
    coin: createBaseCoin({
      coinId: "red-base",
    }),
  }) === null
);

test(
  "Home coin has no absolute cell",
  getCoinAbsoluteCell({
    playerColor: "red",
    playerCount: 4,
    coin: createHomeCoin({
      coinId: "red-home",
    }),
  }) === null
);


// ============================================================
// 3. SAFE CELL TESTS
// ============================================================

console.log("\n========== SAFE CELL TESTS ==========\n");

test(
  "Standard cell 0 is safe",
  isSafeCellForGame({
    playerCount: 4,
    absoluteCell: 0,
  }) === true
);

test(
  "Standard cell 8 is safe",
  isSafeCellForGame({
    playerCount: 4,
    absoluteCell: 8,
  }) === true
);

test(
  "Standard cell 13 is safe",
  isSafeCellForGame({
    playerCount: 4,
    absoluteCell: 13,
  }) === true
);

test(
  "Standard cell 5 is not safe",
  isSafeCellForGame({
    playerCount: 4,
    absoluteCell: 5,
  }) === false
);


// ============================================================
// 4. FIND OPPONENT COINS
// ============================================================

console.log("\n========== OPPONENT SEARCH TESTS ==========\n");

const players = [
  redPlayer,
  greenPlayer,
];

const opponentCoins = findOpponentCoinsAtCell({
  players,
  movingPlayerId: "red-player",
  destinationCell: 18,
  playerCount: 4,
});

test(
  "Opponent coin is found on destination cell",
  opponentCoins.length === 1
);

test(
  "Found opponent has correct player ID",
  opponentCoins[0]?.playerId === "green-player"
);

test(
  "Found opponent has correct color",
  opponentCoins[0]?.playerColor === "green"
);

test(
  "Found opponent has correct coin ID",
  opponentCoins[0]?.coinId === "green-1"
);


// ============================================================
// 5. OWN COIN IS NOT AN OPPONENT
// ============================================================

console.log("\n========== OWN COIN TESTS ==========\n");

const ownCoinSearch = findOpponentCoinsAtCell({
  players,
  movingPlayerId: "red-player",
  destinationCell: 5,
  playerCount: 4,
});

test(
  "Own coin is not returned as an opponent",
  ownCoinSearch.length === 0
);


// ============================================================
// 6. CAN CAPTURE - NORMAL CASE
// ============================================================

console.log("\n========== CAN CAPTURE TESTS ==========\n");

const normalCapture = canCapture({
  players,
  movingPlayerId: "red-player",
  destinationCell: 18,
  playerCount: 4,
});

test(
  "Capture is possible when opponent is on destination",
  normalCapture.canKill === true
);

test(
  "One opponent coin is available to kill",
  normalCapture.opponents.length === 1
);


// ============================================================
// 7. NO OPPONENT
// ============================================================

console.log("\n========== NO OPPONENT TESTS ==========\n");

const noOpponentCapture = canCapture({
  players,
  movingPlayerId: "red-player",
  destinationCell: 20,
  playerCount: 4,
});

test(
  "Capture is not possible without an opponent",
  noOpponentCapture.canKill === false
);

test(
  "No-opponent result contains empty opponents",
  noOpponentCapture.opponents.length === 0
);


// ============================================================
// 8. SAFE CELL PROTECTION
// ============================================================

console.log("\n========== SAFE CELL PROTECTION TESTS ==========\n");

const safeGreenCoin = createMainCoin({
  coinId: "green-safe",
  progress: 0,
});

// Green starts at absolute cell 13.
// Therefore progress 0 = absolute cell 13.
//
// Cell 13 is a safe cell.

const safePlayers = [
  redPlayer,
  createPlayer({
    userId: "green-player",
    color: "green",
    coins: [safeGreenCoin],
  }),
];

const safeCapture = canCapture({
  players: safePlayers,
  movingPlayerId: "red-player",
  destinationCell: 13,
  playerCount: 4,
});

test(
  "Opponent on safe cell cannot be killed",
  safeCapture.canKill === false
);

test(
  "Safe-cell result has no capturable opponents",
  safeCapture.opponents.length === 0
);


// ============================================================
// 9. BASE / HOME / FINISHED COINS CANNOT BE CAPTURED
// ============================================================

console.log("\n========== NON-MAIN COIN TESTS ==========\n");

const nonMainPlayers = [
  redPlayer,

  createPlayer({
    userId: "green-player",
    color: "green",
    coins: [
      createBaseCoin({
        coinId: "green-base",
      }),
      createHomeCoin({
        coinId: "green-home",
      }),
      createFinishedCoin({
        coinId: "green-finished",
      }),
    ],
  }),
];

const baseCapture = canCapture({
  players: nonMainPlayers,
  movingPlayerId: "red-player",
  destinationCell: 18,
  playerCount: 4,
});

test(
  "Base/home/finished coins cannot be captured",
  baseCapture.canKill === false
);


// ============================================================
// 10. RESET COIN TO BASE
// ============================================================

console.log("\n========== RESET TO BASE TESTS ==========\n");

const coinToReset = createMainCoin({
  coinId: "green-1",
  progress: 5,
});

const resetCoin = resetCoinToBase(coinToReset);

test(
  "Killed coin becomes base",
  resetCoin.area === "base"
);

test(
  "Killed coin progress becomes -1",
  resetCoin.progress === -1
);

test(
  "Killed coin absolute cell becomes null",
  resetCoin.absoluteCell === null
);

test(
  "Killed coin keeps its coin ID",
  resetCoin.coinId === "green-1"
);


// ============================================================
// 11. CAPTURE OPPONENT
// ============================================================

console.log("\n========== CAPTURE OPPONENT TESTS ==========\n");

const capturePlayers = [
  redPlayer,

  createPlayer({
    userId: "green-player",
    color: "green",
    coins: [
      createMainCoin({
        coinId: "green-1",
        progress: 5,
      }),
    ],
  }),
];

const captureResult = captureOpponents({
  players: capturePlayers,
  movingPlayerId: "red-player",
  destinationCell: 18,
  playerCount: 4,
});

test(
  "Capture reports that a kill happened",
  captureResult.killed === true
);

test(
  "Exactly one coin was killed",
  captureResult.killedCoins.length === 1
);

test(
  "Killed coin has correct ID",
  captureResult.killedCoins[0]?.coinId === "green-1"
);

const updatedGreenPlayer = captureResult.players.find(
  (player) => player.userId === "green-player"
);

const updatedGreenCoin = updatedGreenPlayer?.coins.find(
  (coin) => coin.coinId === "green-1"
);

test(
  "Killed opponent coin is returned to base",
  updatedGreenCoin?.area === "base"
);

test(
  "Killed opponent coin progress is -1",
  updatedGreenCoin?.progress === -1
);

test(
  "Killed opponent coin absolute cell is null",
  updatedGreenCoin?.absoluteCell === null
);


// ============================================================
// 12. ORIGINAL PLAYER DATA IS NOT MUTATED
// ============================================================

console.log("\n========== IMMUTABILITY TESTS ==========\n");

const immutableGreenCoin = createMainCoin({
  coinId: "green-immutable",
  progress: 5,
});

const immutableGreenPlayer = createPlayer({
  userId: "green-player",
  color: "green",
  coins: [immutableGreenCoin],
});

const immutablePlayers = [
  redPlayer,
  immutableGreenPlayer,
];

captureOpponents({
  players: immutablePlayers,
  movingPlayerId: "red-player",
  destinationCell: 18,
  playerCount: 4,
});

test(
  "Original green coin remains unchanged",
  immutableGreenCoin.area === "main"
);

test(
  "Original green coin keeps its progress",
  immutableGreenCoin.progress === 5
);


// ============================================================
// 13. BACKWARD KILL
// ============================================================
//
// This is one of the most important Reverse Ludo tests.
//
// Red starts at cell 0.
//
// Red coin:
// progress 5
// absolute cell 5
//
// Red moves backward 2:
// destination absolute cell 3
//
// If an opponent is at absolute cell 3,
// that opponent can be killed.
//
// Capture itself does not care whether the movement
// was forward or backward.
//
// ============================================================

console.log("\n========== BACKWARD KILL TESTS ==========\n");

const backwardKillPlayers = [
  createPlayer({
    userId: "red-player",
    color: "red",
    coins: [
      createMainCoin({
        coinId: "red-1",
        progress: 5,
      }),
    ],
  }),

  createPlayer({
    userId: "green-player",
    color: "green",
    coins: [
      // Green starts at 13.
      //
      // We need an absolute cell of 3.
      //
      // 13 + progress = 3 (mod 52)
      // progress = 42
      //
      // Therefore green progress 42 is absolute cell 3.
      createMainCoin({
        coinId: "green-1",
        progress: 42,
      }),
    ],
  }),
];

const backwardKillCheck = canCapture({
  players: backwardKillPlayers,
  movingPlayerId: "red-player",
  destinationCell: 3,
  playerCount: 4,
});

test(
  "Backward destination can contain an opponent",
  backwardKillCheck.canKill === true
);

test(
  "Backward destination opponent can be killed",
  backwardKillCheck.opponents.length === 1
);


// ============================================================
// 14. BACKWARD KILL EXECUTION
// ============================================================

const backwardKillResult = captureOpponents({
  players: backwardKillPlayers,
  movingPlayerId: "red-player",
  destinationCell: 3,
  playerCount: 4,
});

test(
  "Backward kill actually kills opponent",
  backwardKillResult.killed === true
);

test(
  "Backward kill returns opponent to base",
  backwardKillResult.killedCoins.length === 1
);


// ============================================================
// 15. CAPTURE RESULT
// ============================================================

console.log("\n========== CAPTURE RESULT TESTS ==========\n");

const captureResultInfo = getCaptureResult({
  players: capturePlayers,
  movingPlayerId: "red-player",
  destinationCell: 18,
  playerCount: 4,
});

test(
  "Capture result identifies a possible kill",
  captureResultInfo.canKill === true
);

test(
  "Capture result contains opponent information",
  captureResultInfo.opponents.length === 1
);


// ============================================================
// 16. EXTRA TURN AFTER KILL
// ============================================================

console.log("\n========== CAPTURE EXTRA TURN TESTS ==========\n");

test(
  "A kill gives an extra turn",
  getsExtraTurnFromCapture(true) === true
);

test(
  "No kill gives no extra turn",
  getsExtraTurnFromCapture(false) === false
);


// ============================================================
// 17. CAPTURE EVENT
// ============================================================

console.log("\n========== CAPTURE EVENT TESTS ==========\n");

const event = createCaptureEvent({
  movingPlayerId: "red-player",
  destinationCell: 18,
  killedCoins: [
    {
      playerId: "green-player",
      playerColor: "green",
      coinId: "green-1",
    },
  ],
});

test(
  "Capture event has correct type",
  event.type === "coin_killed"
);

test(
  "Capture event has correct player",
  event.playerId === "red-player"
);

test(
  "Capture event has correct destination",
  event.destinationCell === 18
);

test(
  "Capture event contains killed coin",
  event.killedCoins.length === 1
);

test(
  "Capture event gives extra turn",
  event.extraTurn === true
);

test(
  "Capture event reason is kill",
  event.extraTurnReason === "kill"
);


// ============================================================
// 18. NO-KILL EVENT
// ============================================================

const noKillEvent = createCaptureEvent({
  movingPlayerId: "red-player",
  destinationCell: 20,
  killedCoins: [],
});

test(
  "No-kill event does not give extra turn",
  noKillEvent.extraTurn === false
);

test(
  "No-kill event has no extra-turn reason",
  noKillEvent.extraTurnReason === null
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

console.log("🎉 All capture tests passed!");