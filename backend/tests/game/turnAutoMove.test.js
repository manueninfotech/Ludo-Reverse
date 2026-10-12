import assert from "node:assert/strict";
import { shouldAutoMove } from "../../services/game/turnAutoMove.js";

console.log("Running turnAutoMove backend tests...\n");

// 1. Single coin on start tile (progress = 0) with forward legal move
{
  const game = {
    currentTurn: { playerId: "user-1", diceValue: 3 },
    players: [
      {
        userId: "user-1",
        coins: [
          { coinId: "user-1-coin-1", area: "main", progress: 0 },
          { coinId: "user-1-coin-2", area: "base", progress: -1 },
          { coinId: "user-1-coin-3", area: "base", progress: -1 },
          { coinId: "user-1-coin-4", area: "base", progress: -1 },
        ],
      },
    ],
  };
  const legalMoves = [
    { coinId: "user-1-coin-1", direction: "forward" },
  ];

  const result = shouldAutoMove({ game, legalMoves });
  assert.equal(result, true, "Single coin on start tile should auto-move");
}

// 2. Single coin in base / yard (rolled 6)
{
  const game = {
    currentTurn: { playerId: "user-1", diceValue: 6 },
    players: [
      {
        userId: "user-1",
        coins: [
          { coinId: "user-1-coin-1", area: "base", progress: -1 },
          { coinId: "user-1-coin-2", area: "finished", progress: 56 },
          { coinId: "user-1-coin-3", area: "finished", progress: 56 },
          { coinId: "user-1-coin-4", area: "finished", progress: 56 },
        ],
      },
    ],
  };
  const legalMoves = [
    { coinId: "user-1-coin-1", direction: "forward" },
  ];

  const result = shouldAutoMove({ game, legalMoves });
  assert.equal(result, true, "Single coin in base should auto-move");
}

// 3. All coins in base / yard (rolled 6)
{
  const game = {
    currentTurn: { playerId: "user-1", diceValue: 6 },
    players: [
      {
        userId: "user-1",
        coins: [
          { coinId: "user-1-coin-1", area: "base", progress: -1 },
          { coinId: "user-1-coin-2", area: "base", progress: -1 },
          { coinId: "user-1-coin-3", area: "base", progress: -1 },
          { coinId: "user-1-coin-4", area: "base", progress: -1 },
        ],
      },
    ],
  };
  const legalMoves = [
    { coinId: "user-1-coin-1", direction: "forward" },
    { coinId: "user-1-coin-2", direction: "forward" },
    { coinId: "user-1-coin-3", direction: "forward" },
    { coinId: "user-1-coin-4", direction: "forward" },
  ];

  const result = shouldAutoMove({ game, legalMoves });
  assert.equal(result, true, "All coins in base should auto-move");
}

// 4. Coin on track with both forward and backward moves (tactical choice required)
{
  const game = {
    currentTurn: { playerId: "user-1", diceValue: 3 },
    players: [
      {
        userId: "user-1",
        coins: [
          { coinId: "user-1-coin-1", area: "main", progress: 10 },
        ],
      },
    ],
  };
  const legalMoves = [
    { coinId: "user-1-coin-1", direction: "forward" },
    { coinId: "user-1-coin-1", direction: "backward" },
  ];

  const result = shouldAutoMove({ game, legalMoves });
  assert.equal(result, false, "Track coin with forward and backward moves must NOT auto-move");
}

// 5. 1 coin on start + 3 coins in base on rolling 6 (tactical choice: unlock vs advance)
{
  const game = {
    currentTurn: { playerId: "user-1", diceValue: 6 },
    players: [
      {
        userId: "user-1",
        coins: [
          { coinId: "user-1-coin-1", area: "main", progress: 0 },
          { coinId: "user-1-coin-2", area: "base", progress: -1 },
          { coinId: "user-1-coin-3", area: "base", progress: -1 },
          { coinId: "user-1-coin-4", area: "base", progress: -1 },
        ],
      },
    ],
  };
  const legalMoves = [
    { coinId: "user-1-coin-1", direction: "forward" },
    { coinId: "user-1-coin-2", direction: "forward" },
    { coinId: "user-1-coin-3", direction: "forward" },
    { coinId: "user-1-coin-4", direction: "forward" },
  ];

  const result = shouldAutoMove({ game, legalMoves });
  assert.equal(result, false, "Choice between unlocking base coin or advancing start coin must NOT auto-move");
}

console.log("All turnAutoMove backend tests passed!");
