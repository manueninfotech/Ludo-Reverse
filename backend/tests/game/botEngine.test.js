import { decideBotMove } from "../../services/game/botEngine.js";

const assert = (name, condition) => {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
  } else {
    console.error(`❌ FAIL: ${name}`);
    process.exit(1);
  }
};

console.log("\n========== SERVER BOT ENGINE TESTS ==========\n");

// 1. Single move returns immediately
const singleMoveGame = {
  playerCount: 4,
  players: [{ color: "red", coins: [{ coinId: "c1", area: "main", cell: 10 }] }],
  currentTurn: { diceValue: 3 },
};
const singleLegalMoves = [{ coinId: "c1", direction: "forward", to: { cell: 13, area: "main" } }];
const chosen1 = decideBotMove({ game: singleMoveGame, legalMoves: singleLegalMoves, botColor: "red" });
assert("Single legal move is selected immediately", chosen1?.coinId === "c1");

// 2. Reverse ambush priority over regular forward move
const ambushGame = {
  playerCount: 4,
  players: [
    { color: "red", coins: [{ coinId: "c1", area: "main", cell: 20 }] },
    { color: "green", coins: [{ coinId: "g1", area: "main", cell: 17 }] }, // opponent at 17
  ],
  currentTurn: { diceValue: 3 },
};
const ambushMoves = [
  { coinId: "c1", direction: "forward", from: { progress: 10 }, to: { cell: 23, area: "main" } },
  { coinId: "c1", direction: "backward", from: { progress: 10 }, to: { cell: 17, area: "main" } }, // hits green!
];
const chosenAmbush = decideBotMove({ game: ambushGame, legalMoves: ambushMoves, botColor: "red" });
assert("Reverse Ambush move is prioritized when capturing opponent", chosenAmbush?.direction === "backward");

// 3. Forward cut priority when reverse does not cut
const cutGame = {
  playerCount: 4,
  players: [
    { color: "red", coins: [{ coinId: "c1", area: "main", cell: 20 }] },
    { color: "blue", coins: [{ coinId: "b1", area: "main", cell: 24 }] }, // opponent at 24
  ],
  currentTurn: { diceValue: 4 },
};
const cutMoves = [
  { coinId: "c1", direction: "forward", from: { progress: 10 }, to: { cell: 24, area: "main" } }, // hits blue!
  { coinId: "c1", direction: "backward", from: { progress: 10 }, to: { cell: 16, area: "main" } },
];
const chosenCut = decideBotMove({ game: cutGame, legalMoves: cutMoves, botColor: "red" });
assert("Forward Cut is prioritized when capturing opponent", chosenCut?.direction === "forward" && chosenCut?.to?.cell === 24);

// 4. Reach Goal / Finish priority
const finishGame = {
  playerCount: 4,
  players: [{ color: "red", coins: [{ coinId: "c1", area: "home" }, { coinId: "c2", area: "main", cell: 10 }] }],
  currentTurn: { diceValue: 2 },
};
const finishMoves = [
  { coinId: "c2", direction: "forward", from: { progress: 10 }, to: { cell: 12, area: "main" } },
  { coinId: "c1", direction: "forward", from: { progress: 54 }, to: { area: "finished" } },
];
const chosenFinish = decideBotMove({ game: finishGame, legalMoves: finishMoves, botColor: "red" });
assert("Reaching finish goal is prioritized over regular advance", chosenFinish?.to?.area === "finished");

// 5. Unlock from base on 6
const unlockGame = {
  playerCount: 4,
  players: [{ color: "red", coins: [{ coinId: "c1", area: "base" }, { coinId: "c2", area: "main", cell: 10 }] }],
  currentTurn: { diceValue: 6 },
};
const unlockMoves = [
  { coinId: "c2", direction: "forward", from: { progress: 10 }, to: { cell: 16, area: "main" } },
  { coinId: "c1", direction: "forward", from: { area: "base" }, to: { progress: 0, cell: 39, area: "main" } },
];
const chosenUnlock = decideBotMove({ game: unlockGame, legalMoves: unlockMoves, botColor: "red" });
assert("Unlocking token from base on roll 6 is prioritized", chosenUnlock?.from?.area === "base");

console.log("\n🎉 All bot engine tests passed successfully!\n");
