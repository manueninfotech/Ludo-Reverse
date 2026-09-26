// ============================================================
// REVERSE LUDO - GAME ENGINE TESTS
// ============================================================

import assert from "node:assert/strict";

import {
  createInitialGameState,
  getCurrentPlayer,
  getPlayerById,
  getCoin,
  rollGameDice,
  getLegalMoves,
  getCoinLegalMoves,
  moveCoin,
  checkWinner,
  checkGameFinished,
  prepareGameExtraTurn,
  completeGameTurn,
} from "../../services/game/gameEngine.js";

import {
  TURN_TIMEOUT_MS,
} from "../../services/game/turn.js";

console.log("Running game engine tests...\n");


// ============================================================
// TEST PLAYERS
// ============================================================

const players2 = [
  {
    userId: "user-1",
    name: "Player 1",
    color: "red",
  },
  {
    userId: "user-2",
    name: "Player 2",
    color: "green",
  },
];

const players4 = [
  {
    userId: "user-1",
    name: "Player 1",
    color: "red",
  },
  {
    userId: "user-2",
    name: "Player 2",
    color: "green",
  },
  {
    userId: "user-3",
    name: "Player 3",
    color: "yellow",
  },
  {
    userId: "user-4",
    name: "Player 4",
    color: "blue",
  },
];

const players6 = [
  {
    userId: "user-1",
    name: "Player 1",
    color: "red",
  },
  {
    userId: "user-2",
    name: "Player 2",
    color: "green",
  },
  {
    userId: "user-3",
    name: "Player 3",
    color: "orange",
  },
  {
    userId: "user-4",
    name: "Player 4",
    color: "blue",
  },
  {
    userId: "user-5",
    name: "Player 5",
    color: "yellow",
  },
  {
    userId: "user-6",
    name: "Player 6",
    color: "purple",
  },
];

const players7 = [
  {
    userId: "user-1",
    name: "Player 1",
    color: "red",
  },
  {
    userId: "user-2",
    name: "Player 2",
    color: "green",
  },
  {
    userId: "user-3",
    name: "Player 3",
    color: "orange",
  },
  {
    userId: "user-4",
    name: "Player 4",
    color: "blue",
  },
  {
    userId: "user-5",
    name: "Player 5",
    color: "yellow",
  },
  {
    userId: "user-6",
    name: "Player 6",
    color: "purple",
  },
  {
    userId: "user-7",
    name: "Player 7",
    color: "pink",
  },
];

const players8 = [
  ...players7,
  {
    userId: "user-8",
    name: "Player 8",
    color: "cyan",
  },
];


// ============================================================
// 1. CREATE INITIAL GAME - 2 PLAYERS
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  assert.equal(game.status, "playing");
  assert.equal(game.playerCount, 2);
  assert.equal(game.boardType, "standard-4");

  assert.equal(game.players.length, 2);

  assert.equal(
    game.currentTurn.playerId,
    "user-1"
  );

  assert.equal(game.winnerId, null);
  assert.equal(game.moveCount, 0);

  console.log("✓ create initial 2-player game");
}


// ============================================================
// 2. CREATE INITIAL GAME - 4 PLAYERS
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 4,
    players: players4,
  });

  assert.equal(game.status, "playing");
  assert.equal(game.playerCount, 4);
  assert.equal(game.boardType, "standard-4");

  assert.equal(game.players.length, 4);

  console.log("✓ create initial 4-player game");
}


// ============================================================
// 3. CREATE INITIAL GAME - 6 PLAYERS
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 6,
    players: players6,
  });

  assert.equal(game.status, "playing");
  assert.equal(game.playerCount, 6);
  assert.equal(game.boardType, "six-player");

  assert.equal(game.players.length, 6);

  console.log("✓ create initial 6-player game");
}

// ============================================================
// 7-PLAYER GAME
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 7,
    players: players7,
  });

  assert.equal(game.status, "playing");
  assert.equal(game.playerCount, 7);
  assert.equal(game.players.length, 7);
  assert.equal(game.boardType, "seven-player");

  console.log("✓ create initial 7-player game");
}

// ============================================================
// 8-PLAYER GAME
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 8,
    players: players8,
  });

  assert.equal(game.status, "playing");
  assert.equal(game.playerCount, 8);
  assert.equal(game.players.length, 8);
  assert.equal(game.boardType, "eight-player");

  console.log("✓ create initial 8-player game");
}

// ============================================================
// 7 & 8 PLAYER START CELLS
// ============================================================

{
  const game7 = createInitialGameState({
    playerCount: 7,
    players: players7,
  });

  const expectedStartCells7 = [
    0, 12, 24, 36, 48, 60, 72,
  ];

  game7.players.forEach((player, index) => {
    assert.equal(
      player.startCell,
      expectedStartCells7[index]
    );
  });

  console.log("✓ 7-player start cells assigned");

  const game8 = createInitialGameState({
    playerCount: 8,
    players: players8,
  });

  const expectedStartCells8 = [
    0, 12, 24, 36, 48, 60, 72, 84,
  ];

  game8.players.forEach((player, index) => {
    assert.equal(
      player.startCell,
      expectedStartCells8[index]
    );
  });

  console.log("✓ 8-player start cells assigned");
}

// ============================================================
// 4. EVERY PLAYER GETS 4 COINS
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 4,
    players: players4,
  });

  for (const player of game.players) {
    assert.equal(player.coins.length, 4);
  }

  console.log("✓ every player gets 4 coins");
}


// ============================================================
// 5. COINS START IN BASE
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  for (const player of game.players) {
    for (const coin of player.coins) {
      assert.equal(coin.area, "base");
      assert.equal(coin.progress, -1);
      assert.equal(coin.absoluteCell, null);
    }
  }

  console.log("✓ all coins start in base");
}


// ============================================================
// 6. COIN IDs ARE UNIQUE
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 4,
    players: players4,
  });

  const coinIds = game.players.flatMap(
    (player) =>
      player.coins.map(
        (coin) => coin.coinId
      )
  );

  assert.equal(
    new Set(coinIds).size,
    coinIds.length
  );

  console.log("✓ coin IDs are unique");
}


// ============================================================
// 7. PLAYER START CELLS ARE ASSIGNED
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 4,
    players: players4,
  });

  assert.equal(
  game.players[0].startCell,
  39
);

assert.equal(
  game.players[1].startCell,
  0
);

assert.equal(
  game.players[2].startCell,
  13
);

assert.equal(
  game.players[3].startCell,
  26
);

  console.log("✓ player start cells assigned");
}


// ============================================================
// 8. GET CURRENT PLAYER
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const currentPlayer =
    getCurrentPlayer(game);

  assert.ok(currentPlayer);
  assert.equal(
    currentPlayer.userId,
    "user-1"
  );

  console.log("✓ get current player");
}


// ============================================================
// 9. GET PLAYER BY ID
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const player = getPlayerById({
    game,
    playerId: "user-2",
  });

  assert.ok(player);
  assert.equal(
    player.name,
    "Player 2"
  );

  console.log("✓ get player by ID");
}


// ============================================================
// 10. GET UNKNOWN PLAYER
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const player = getPlayerById({
    game,
    playerId: "unknown-user",
  });

  assert.equal(player, null);

  console.log("✓ unknown player handled");
}


// ============================================================
// 11. GET COIN
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const player = game.players[0];

  const coin = getCoin({
    player,
    coinId: "user-1-coin-1",
  });

  assert.ok(coin);
  assert.equal(
    coin.coinId,
    "user-1-coin-1"
  );

  console.log("✓ get coin");
}


// ============================================================
// 12. GET UNKNOWN COIN
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const player = game.players[0];

  const coin = getCoin({
    player,
    coinId: "unknown-coin",
  });

  assert.equal(coin, null);

  console.log("✓ unknown coin handled");
}


// ============================================================
// 13. DICE CANNOT BE ROLLED AFTER GAME ENDS
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const finishedGame = {
    ...game,
    status: "finished",
  };

  const result = rollGameDice({
    game: finishedGame,
    diceValue: 4,
  });

  assert.equal(result.success, false);
  assert.equal(
    result.reason,
    "Game is not currently playing."
  );

  console.log("✓ dice rejected after game ends");
}


// ============================================================
// 14. INVALID DICE VALUE REJECTED
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const result = rollGameDice({
    game,
    diceValue: 7,
  });

  assert.equal(result.success, false);
  assert.equal(
    result.reason,
    "Invalid dice value."
  );

  console.log("✓ invalid dice rejected");
}


// ============================================================
// 15. NORMAL DICE ROLL
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const result = rollGameDice({
    game,
    diceValue: 4,
  });

  assert.equal(result.success, true);
  assert.equal(result.diceValue, 4);

  assert.equal(
    result.game.currentTurn.diceValue,
    4
  );

  assert.equal(
    result.game.currentTurn.hasRolled,
    true
  );

  assert.equal(
    result.game.currentTurn.extraTurn,
    false
  );

  console.log("✓ normal dice roll");
}


// ============================================================
// 16. ROLLING 6 CREATES EXTRA TURN
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const result = rollGameDice({
    game,
    diceValue: 6,
  });

  assert.equal(result.success, true);

  assert.equal(
    result.game.currentTurn.diceValue,
    6
  );

  assert.equal(
    result.game.currentTurn.extraTurn,
    true
  );

  assert.equal(
    result.game.currentTurn.extraTurnReason,
    "six"
  );

  assert.equal(
    result.game.currentTurn.backwardAllowed,
    true
  );

  console.log("✓ six creates extra turn");
}


// ============================================================
// 17. CANNOT ROLL TWICE
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const firstRoll = rollGameDice({
    game,
    diceValue: 4,
  });

  assert.equal(firstRoll.success, true);

  const secondRoll = rollGameDice({
    game: firstRoll.game,
    diceValue: 3,
  });

  assert.equal(secondRoll.success, false);

  assert.equal(
    secondRoll.reason,
    "Dice has already been rolled for this turn."
  );

  console.log("✓ cannot roll twice");
}


// ============================================================
// 18. LEGAL MOVES BEFORE DICE ROLL
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const moves = getLegalMoves({
    game,
  });

  assert.ok(Array.isArray(moves));
  assert.equal(moves.length, 0);

  console.log("✓ no legal moves before dice roll");
}


// ============================================================
// 19. LEGAL MOVES AFTER ROLLING 6
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const rolled = rollGameDice({
    game,
    diceValue: 6,
  });

  assert.equal(rolled.success, true);

  const moves = getLegalMoves({
    game: rolled.game,
  });

  assert.ok(Array.isArray(moves));

  // At least one base coin should be able
  // to enter the board on a 6.
  assert.ok(moves.length > 0);

  console.log("✓ legal moves available after rolling 6");
}


// ============================================================
// 20. COIN LEGAL MOVE CHECK BEFORE DICE
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const result = getCoinLegalMoves({
    game,
    coinId: "user-1-coin-1",
  });

  assert.equal(result, false);

  console.log("✓ coin cannot move before dice");
}


// ============================================================
// 21. COIN LEGAL MOVE CHECK AFTER DICE 6
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const rolled = rollGameDice({
    game,
    diceValue: 6,
  });

  assert.equal(rolled.success, true);

  const result = getCoinLegalMoves({
    game: rolled.game,
    coinId: "user-1-coin-1",
  });

  assert.equal(result, true);

  console.log("✓ base coin can move on 6");
}


// ============================================================
// 22. MOVE COIN OUT OF BASE WITH 6
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const rolled = rollGameDice({
    game,
    diceValue: 6,
  });

  assert.equal(rolled.success, true);

  const result = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "forward",
  });

  assert.equal(result.success, true);

  const movedCoin =
    result.game.players[0].coins.find(
      (coin) =>
        coin.coinId === "user-1-coin-1"
    );

  assert.ok(movedCoin);

  assert.equal(
    movedCoin.area,
    "main"
  );

  assert.equal(
    movedCoin.progress,
    0
  );

  assert.equal(
    movedCoin.absoluteCell,
    39
  );

  assert.equal(
    result.game.moveCount,
    1
  );

  console.log("✓ coin moves out of base on 6");
}


// ============================================================
// 23. COIN CANNOT MOVE BEFORE DICE
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const result = moveCoin({
    game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "forward",
  });

  assert.equal(result.success, false);

  assert.equal(
    result.reason,
    "Dice must be rolled first."
  );

  console.log("✓ cannot move before dice roll");
}


// ============================================================
// 24. WRONG PLAYER CANNOT MOVE
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const rolled = rollGameDice({
    game,
    diceValue: 6,
  });

  const result = moveCoin({
    game: rolled.game,
    playerId: "user-2",
    coinId: "user-2-coin-1",
    direction: "forward",
  });

  assert.equal(result.success, false);

  assert.equal(
    result.reason,
    "It is not this player's turn."
  );

  console.log("✓ wrong player cannot move");
}


// ============================================================
// 25. INVALID DIRECTION REJECTED
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const rolled = rollGameDice({
    game,
    diceValue: 6,
  });

  const result = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "sideways",
  });

  assert.equal(result.success, false);

  assert.equal(
    result.reason,
    "Direction must be forward or backward."
  );

  console.log("✓ invalid direction rejected");
}


// ============================================================
// 26. SIX ALLOWS BACKWARD MOVEMENT
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  // ----------------------------------------------------------
  // Put Red coin on the main track
  // ----------------------------------------------------------

  const preparedGame = {
    ...game,

    players: game.players.map(
      (player) => {
        if (player.userId !== "user-1") {
          return player;
        }

        return {
          ...player,

          coins: player.coins.map(
            (coin, index) => {
              if (index !== 0) {
                return coin;
              }

              return {
                ...coin,
                area: "main",
                progress: 10,
                absoluteCell: 10,
              };
            }
          ),
        };
      }
    ),
  };

  // ----------------------------------------------------------
  // Player 1 rolls 6
  // ----------------------------------------------------------

  const rolled = rollGameDice({
    game: preparedGame,
    diceValue: 6,
  });

  assert.equal(rolled.success, true);

  assert.equal(
    rolled.game.currentTurn.backwardAllowed,
    true
  );

  // ----------------------------------------------------------
  // Move Red coin backward
  // 10 → 4
  // ----------------------------------------------------------

  const result = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "backward",
  });

  assert.equal(result.success, true);

  const movedCoin =
    result.game.players[0].coins.find(
      (coin) =>
        coin.coinId === "user-1-coin-1"
    );

  assert.ok(movedCoin);

  assert.equal(
    movedCoin.progress,
    4
  );

  assert.equal(
    movedCoin.absoluteCell,
    43
  );

  // ----------------------------------------------------------
  // 6 + backward
  // → extra turn
  // → backward disabled for the extra turn
  // ----------------------------------------------------------

  assert.equal(
    result.game.currentTurn.extraTurn,
    true
  );

  assert.equal(
    result.game.currentTurn.extraTurnReason,
    "six"
  );

  assert.equal(
    result.game.currentTurn.backwardAllowed,
    false
  );

  console.log(
    "✓ six allows backward and disables backward on extra turn"
  );
}

// ============================================================
// 27. NORMAL ROLL ALLOWS BACKWARD
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  // Put coin on main track manually.
  const preparedGame = {
    ...game,

    players: game.players.map(
      (player) => {
        if (player.userId !== "user-1") {
          return player;
        }

        return {
          ...player,

          coins: player.coins.map(
            (coin, index) => {
              if (index !== 0) {
                return coin;
              }

              return {
                ...coin,
                area: "main",
                progress: 5,
                absoluteCell: 5,
              };
            }
          ),
        };
      }
    ),
  };

  const rolled = rollGameDice({
    game: preparedGame,
    diceValue: 2,
  });

  assert.equal(rolled.success, true);

  const result = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "backward",
  });

  assert.equal(result.success, true);

  const movedCoin =
    result.game.players[0].coins.find(
      (coin) =>
        coin.coinId === "user-1-coin-1"
    );

  assert.equal(
    movedCoin.progress,
    3
  );

  console.log("✓ normal roll allows backward");
}


// ============================================================
// 28. BACKWARD CANNOT PASS START
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const preparedGame = {
    ...game,

    players: game.players.map(
      (player) => {
        if (player.userId !== "user-1") {
          return player;
        }

        return {
          ...player,

          coins: player.coins.map(
            (coin, index) => {
              if (index !== 0) {
                return coin;
              }

              return {
                ...coin,
                area: "main",
                progress: 3,
                absoluteCell: 3,
              };
            }
          ),
        };
      }
    ),
  };

  const rolled = rollGameDice({
    game: preparedGame,
    diceValue: 5,
  });

  assert.equal(rolled.success, true);

  const result = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "backward",
  });

  assert.equal(result.success, false);

  console.log("✓ backward cannot pass own start");
}


// ============================================================
// 29. BACKWARD CAN LAND EXACTLY ON START
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const preparedGame = {
    ...game,

    players: game.players.map(
      (player) => {
        if (player.userId !== "user-1") {
          return player;
        }

        return {
          ...player,

          coins: player.coins.map(
            (coin, index) => {
              if (index !== 0) {
                return coin;
              }

              return {
                ...coin,
                area: "main",
                progress: 3,
                absoluteCell: 3,
              };
            }
          ),
        };
      }
    ),
  };

  const rolled = rollGameDice({
    game: preparedGame,
    diceValue: 3,
  });

  assert.equal(rolled.success, true);

  const result = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "backward",
  });

  assert.equal(result.success, true);

  const movedCoin =
    result.game.players[0].coins.find(
      (coin) =>
        coin.coinId === "user-1-coin-1"
    );

  assert.equal(
    movedCoin.progress,
    0
  );

  assert.equal(
    movedCoin.absoluteCell,
    39
  );

  console.log("✓ backward can land exactly on start");
}


// ============================================================
// 30. FINISHED COIN CANNOT MOVE
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const preparedGame = {
    ...game,

    players: game.players.map(
      (player) => {
        if (player.userId !== "user-1") {
          return player;
        }

        return {
          ...player,

          coins: player.coins.map(
            (coin, index) => {
              if (index !== 0) {
                return coin;
              }

              return {
                ...coin,
                area: "finished",
                progress: 56,
                absoluteCell: null,
              };
            }
          ),
        };
      }
    ),
  };

  const rolled = rollGameDice({
    game: preparedGame,
    diceValue: 4,
  });

  assert.equal(rolled.success, true);

  const result = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "forward",
  });
  

  assert.equal(result.success, false);

  console.log("✓ finished coin cannot move");
}

// ============================================================
// 31. FINISHING A COIN GIVES EXTRA TURN
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const preparedGame = {
    ...game,

    players: game.players.map((player) => {
      if (player.userId !== "user-1") {
        return player;
      }

      return {
        ...player,

        coins: player.coins.map((coin, index) => {
          if (index !== 0) {
            return coin;
          }

          return {
            ...coin,
            area: "home",
            progress: 54,
            absoluteCell: null,
          };
        }),
      };
    }),
  };

  const rolled = rollGameDice({
    game: preparedGame,
    diceValue: 2,
  });

  assert.equal(rolled.success, true);

  const result = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "forward",
  });

  assert.equal(result.success, true);

  const movedCoin =
    result.game.players[0].coins.find(
      (coin) => coin.coinId === "user-1-coin-1"
    );

  assert.equal(movedCoin.area, "finished");
  assert.equal(movedCoin.progress, 56);

  // Finishing gives the same player another turn.
  assert.equal(
    result.game.currentTurn.playerId,
    "user-1"
  );

  assert.equal(
    result.game.currentTurn.extraTurn,
    true
  );

  assert.equal(
    result.game.currentTurn.extraTurnReason,
    "finish"
  );

  console.log("✓ finishing a coin gives extra turn");
}


// ============================================================
// 31. PREPARE EXTRA TURN
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const rolled = rollGameDice({
    game,
    diceValue: 6,
  });

  assert.equal(rolled.success, true);

  const result = prepareGameExtraTurn({
    game: rolled.game,
  });

  assert.equal(result.success, true);

  assert.equal(
    result.game.currentTurn.playerId,
    "user-1"
  );

  assert.equal(
    result.game.currentTurn.diceValue,
    null
  );

  assert.equal(
    result.game.currentTurn.hasRolled,
    false
  );

  assert.equal(
    result.game.currentTurn.extraTurn,
    true
  );

  assert.equal(
    result.game.currentTurn.backwardAllowed,
    true
  );

  console.log("✓ prepare extra turn");
}


// ============================================================
// 32. COMPLETE GAME TURN
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const result = completeGameTurn({
    game,
  });

  assert.equal(result.success, true);

  assert.equal(
    result.game.currentTurn.playerId,
    "user-2"
  );

  assert.equal(
    result.game.currentTurn.hasRolled,
    false
  );

  assert.equal(
    result.game.currentTurn.extraTurn,
    false
  );

  console.log("✓ complete game turn");
}


// ============================================================
// 33. COMPLETE GAME TURN WRAPS AROUND
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const gameAtPlayer2 = {
    ...game,

    currentTurn: {
      ...game.currentTurn,
      playerId: "user-2",
    },
  };

  const result = completeGameTurn({
    game: gameAtPlayer2,
  });

  assert.equal(result.success, true);

  assert.equal(
    result.game.currentTurn.playerId,
    "user-1"
  );

  console.log("✓ game turn wraps around");
}

// ============================================================
// 34. 7-PLAYER TURN ROTATION
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 7,
    players: players7,
  });

  let currentGame = game;

  const expectedOrder = [
    "user-1",
    "user-2",
    "user-3",
    "user-4",
    "user-5",
    "user-6",
    "user-7",
    "user-1",
  ];

  for (let i = 0; i < expectedOrder.length - 1; i++) {
    assert.equal(
      currentGame.currentTurn.playerId,
      expectedOrder[i]
    );

    const result = completeGameTurn({
      game: currentGame,
    });

    assert.equal(result.success, true);

    currentGame = result.game;
  }

  assert.equal(
    currentGame.currentTurn.playerId,
    "user-1"
  );

  console.log("✓ 7-player turn rotation");
}

// ============================================================
// 35. 8-PLAYER TURN ROTATION
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 8,
    players: players8,
  });

  let currentGame = game;

  const expectedOrder = [
    "user-1",
    "user-2",
    "user-3",
    "user-4",
    "user-5",
    "user-6",
    "user-7",
    "user-8",
    "user-1",
  ];

  for (let i = 0; i < expectedOrder.length - 1; i++) {
    assert.equal(
      currentGame.currentTurn.playerId,
      expectedOrder[i]
    );

    const result = completeGameTurn({
      game: currentGame,
    });

    assert.equal(result.success, true);

    currentGame = result.game;
  }

  assert.equal(
    currentGame.currentTurn.playerId,
    "user-1"
  );

  console.log("✓ 8-player turn rotation");
}

// ============================================================
// 36. 7-PLAYER NORMAL MOVEMENT
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 7,
    players: players7,
  });

  const rolled = rollGameDice({
    game,
    diceValue: 6,
  });

  assert.equal(rolled.success, true);

  const result = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "forward",
  });

  assert.equal(result.success, true);

  const movedCoin =
    result.game.players[0].coins.find(
      (coin) =>
        coin.coinId === "user-1-coin-1"
    );

  assert.ok(movedCoin);

  assert.equal(movedCoin.area, "main");
  assert.equal(movedCoin.progress, 0);
  assert.equal(movedCoin.absoluteCell, 0);

  console.log("✓ 7-player normal movement");
}

// ============================================================
// 37. 8-PLAYER NORMAL MOVEMENT
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 8,
    players: players8,
  });

  const rolled = rollGameDice({
    game,
    diceValue: 6,
  });

  assert.equal(rolled.success, true);

  const result = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "forward",
  });

  assert.equal(result.success, true);

  const movedCoin =
    result.game.players[0].coins.find(
      (coin) =>
        coin.coinId === "user-1-coin-1"
    );

  assert.ok(movedCoin);

  assert.equal(movedCoin.area, "main");
  assert.equal(movedCoin.progress, 0);
  assert.equal(movedCoin.absoluteCell, 0);

  console.log("✓ 8-player normal movement");
}

// ============================================================
// 38. 7-PLAYER CAPTURE
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 7,
    players: players7,
  });

  const preparedGame = {
    ...game,

    players: game.players.map((player) => ({
      ...player,
      coins: player.coins.map((coin, index) => {
        if (
          player.userId === "user-1" &&
          index === 0
        ) {
          return {
            ...coin,
            area: "main",
            progress: 5,
            absoluteCell: 5,
          };
        }

        if (
          player.userId === "user-7" &&
          index === 0
        ) {
          return {
            ...coin,
            area: "main",
            progress: 23,
            absoluteCell: 11,
          };
        }

        return coin;
      }),
    })),

    currentTurn: {
      ...game.currentTurn,
      playerId: "user-1",
      diceValue: 6,
      hasRolled: true,
      diceRolled: true,
    },
  };

  const result = moveCoin({
    game: preparedGame,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "forward",
  });

  assert.equal(result.success, true);

  const capturedCoin =
    result.game.players
      .find(
        (player) =>
          player.userId === "user-7"
      )
      .coins[0];

  assert.equal(
    capturedCoin.area,
    "base"
  );

  assert.equal(
    capturedCoin.progress,
    -1
  );

  console.log("✓ 7-player capture");
}


// ============================================================
// 39. 8-PLAYER CAPTURE
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 8,
    players: players8,
  });

  const preparedGame = {
    ...game,

    players: game.players.map((player) => ({
      ...player,
      coins: player.coins.map((coin, index) => {
        if (
          player.userId === "user-1" &&
          index === 0
        ) {
          return {
            ...coin,
            area: "main",
            progress: 5,
            absoluteCell: 5,
          };
        }

        if (
          player.userId === "user-8" &&
          index === 0
        ) {
          return {
            ...coin,
            area: "main",
            progress: 23,
            absoluteCell: 11,
          };
        }

        return coin;
      }),
    })),

    currentTurn: {
      ...game.currentTurn,
      playerId: "user-1",
      diceValue: 6,
      hasRolled: true,
      diceRolled: true,
    },
  };

  const result = moveCoin({
    game: preparedGame,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "forward",
  });

  assert.equal(result.success, true);

  const capturedCoin =
    result.game.players
      .find(
        (player) =>
          player.userId === "user-8"
      )
      .coins[0];

  assert.equal(
    capturedCoin.area,
    "base"
  );

  assert.equal(
    capturedCoin.progress,
    -1
  );

  console.log("✓ 8-player capture");
}

// ============================================================
// 34. CHECK WINNER - NO WINNER
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const winner = checkWinner({
    game,
  });

  assert.equal(winner, null);

  console.log("✓ no winner at game start");
}


// ============================================================
// 35. CHECK WINNER
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const winningGame = {
    ...game,

    players: game.players.map(
      (player) => {
        if (player.userId !== "user-1") {
          return player;
        }

        return {
          ...player,

          coins: player.coins.map(
            (coin) => ({
              ...coin,
              area: "finished",
              progress: 56,
              absoluteCell: null,
            })
          ),
        };
      }
    ),
  };

  const winner = checkWinner({
    game: winningGame,
  });

  assert.ok(winner);
  assert.equal(
    winner.userId,
    "user-1"
  );

  console.log("✓ winner detected");
}


// ============================================================
// 36. FINISH GAME WHEN PLAYER WINS
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const winningGame = {
    ...game,

    players: game.players.map(
      (player) => {
        if (player.userId !== "user-1") {
          return player;
        }

        return {
          ...player,

          coins: player.coins.map(
            (coin) => ({
              ...coin,
              area: "finished",
              progress: 56,
              absoluteCell: null,
            })
          ),
        };
      }
    ),
  };

  const result = checkGameFinished({
    game: winningGame,
  });

  assert.equal(
    result.finished,
    true
  );

  assert.equal(
    result.game.status,
    "finished"
  );

  assert.equal(
    result.game.winnerId,
    "user-1"
  );

  assert.equal(
    result.winner.userId,
    "user-1"
  );

  console.log("✓ game finishes when player wins");
}

// ============================================================
//  7-PLAYER FINISH ORDER
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 7,
    players: players7,
  });

  const finishedGame = {
    ...game,

    players: game.players.map((player) => {
      if (player.userId !== "user-1") {
        return player;
      }

      return {
        ...player,

        coins: player.coins.map((coin) => ({
          ...coin,
          area: "finished",
          progress: 89,
          absoluteCell: null,
        })),
      };
    }),
  };

  const result = checkGameFinished({
    game: finishedGame,
  });

  assert.equal(result.finished, false);

  assert.equal(
    result.game.status,
    "playing"
  );

  assert.deepEqual(
    result.game.finishOrder,
    ["user-1"]
  );

  console.log("✓ 7-player first finisher recorded");
}

// ============================================================
//  8-PLAYER FINISH ORDER
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 8,
    players: players8,
  });

  const finishedGame = {
    ...game,

    players: game.players.map((player) => {
      if (player.userId !== "user-1") {
        return player;
      }

      return {
        ...player,

        coins: player.coins.map((coin) => ({
          ...coin,
          area: "finished",
          progress: 101,
          absoluteCell: null,
        })),
      };
    }),
  };

  const result = checkGameFinished({
    game: finishedGame,
  });

  assert.equal(result.finished, false);

  assert.equal(
    result.game.status,
    "playing"
  );

  assert.deepEqual(
    result.game.finishOrder,
    ["user-1"]
  );

  console.log("✓ 8-player first finisher recorded");
}


// ============================================================
//  7-PLAYER GAME ENDS WITH LAST PLAYER
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 7,
    players: players7,
  });

  const finishedGame = {
    ...game,

    finishOrder: [
      "user-1",
      "user-2",
      "user-3",
      "user-4",
      "user-5",
      "user-6",
    ],

    players: game.players.map((player) => {
      if (
        [
          "user-1",
          "user-2",
          "user-3",
          "user-4",
          "user-5",
          "user-6",
          "user-7",
        ].includes(player.userId)
      ) {
        return {
          ...player,

          coins: player.coins.map((coin) => ({
            ...coin,
            area: "finished",
            progress: 89,
            absoluteCell: null,
          })),
        };
      }

      return player;
    }),
  };

  const result = checkGameFinished({
    game: finishedGame,
  });

  assert.equal(result.finished, true);

  assert.equal(
    result.game.status,
    "finished"
  );

  assert.deepEqual(
    result.game.finishOrder,
    [
      "user-1",
      "user-2",
      "user-3",
      "user-4",
      "user-5",
      "user-6",
      "user-7",
    ]
  );

  console.log("✓ 7-player game ends with last player");
}

// ============================================================
//  8-PLAYER GAME ENDS WITH LAST PLAYER
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 8,
    players: players8,
  });

  const finishedGame = {
    ...game,

    finishOrder: [
      "user-1",
      "user-2",
      "user-3",
      "user-4",
      "user-5",
      "user-6",
      "user-7",
    ],

    players: game.players.map((player) => {
      if (
        [
          "user-1",
          "user-2",
          "user-3",
          "user-4",
          "user-5",
          "user-6",
          "user-7",
          "user-8",
        ].includes(player.userId)
      ) {
        return {
          ...player,

          coins: player.coins.map((coin) => ({
            ...coin,
            area: "finished",
            progress: 101,
            absoluteCell: null,
          })),
        };
      }

      return player;
    }),
  };

  const result = checkGameFinished({
    game: finishedGame,
  });

  assert.equal(result.finished, true);

  assert.equal(
    result.game.status,
    "finished"
  );

  assert.deepEqual(
    result.game.finishOrder,
    [
      "user-1",
      "user-2",
      "user-3",
      "user-4",
      "user-5",
      "user-6",
      "user-7",
      "user-8",
    ]
  );

  console.log("✓ 8-player game ends with last player");
}


// ============================================================
//  9-PLAYER GAME IS REJECTED
// ============================================================

{
  const players9 = [
    ...players8,
    {
      userId: "user-9",
      name: "Player 9",
      color: "lime",
    },
  ];

  assert.throws(
    () => {
      createInitialGameState({
        playerCount: 9,
        players: players9,
      });
    },
    /Player count must be between 2 and 8/
  );

  console.log("✓ 9-player game rejected");
}

// ============================================================
// 37. GAME DOES NOT FINISH WITHOUT WINNER
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const result = checkGameFinished({
    game,
  });

  assert.equal(
    result.finished,
    false
  );

  assert.equal(
    result.game.status,
    "playing"
  );

  console.log("✓ game remains playing without winner");
}


// ============================================================
// 38. EXPIRED TURN REJECTS DICE
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const expiredTurn = {
    ...game.currentTurn,

    turnStartedAt: new Date(
      Date.now() - TURN_TIMEOUT_MS - 1000
    ),

    turnExpiresAt: new Date(
      Date.now() - 1000
    ),
  };

  const expiredGame = {
    ...game,

    currentTurn: expiredTurn,
  };

  const result = rollGameDice({
    game: expiredGame,
    diceValue: 4,
  });

  assert.equal(
    result.success,
    false
  );

  assert.equal(
    result.reason,
    "Turn has expired."
  );

  console.log("✓ expired turn rejects dice");
}


// ============================================================
// 39. MOVE COUNT INCREASES
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const rolled = rollGameDice({
    game,
    diceValue: 6,
  });

  const moved = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "forward",
  });

  assert.equal(moved.success, true);

  assert.equal(
    moved.game.moveCount,
    1
  );

  console.log("✓ move count increases");
}


// ============================================================
// 40. ORIGINAL GAME IS NOT MUTATED BY MOVE
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  const rolled = rollGameDice({
    game,
    diceValue: 6,
  });

  const originalCoin =
    rolled.game.players[0].coins[0];

  const moved = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "forward",
  });

  assert.equal(moved.success, true);

  assert.equal(
    originalCoin.area,
    "base"
  );

  assert.equal(
    originalCoin.progress,
    -1
  );

  console.log("✓ move returns new game state");
}

// ============================================================
// 41. FORWARD MOVE CAPTURES OPPONENT
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  // ----------------------------------------------------------
  // Put Red coin at absolute cell 5
  // ----------------------------------------------------------

  const setupGame = {
    ...game,

    players: game.players.map(
      (player) => {
        if (player.userId === "user-1") {
          return {
            ...player,

            coins: player.coins.map(
              (coin) => {
                if (
                  coin.coinId !== "user-1-coin-1"
                ) {
                  return coin;
                }

                return {
                  ...coin,
                  area: "main",
                  progress: 5,
                  absoluteCell: 5,
                };
              }
            ),
          };
        }

        // ----------------------------------------------------
        // Green coin at absolute cell 6
        //
        // Green starts at 13.
        // (13 + 45) % 52 = 6
        // ----------------------------------------------------

        if (player.userId === "user-2") {
          return {
            ...player,

            coins: player.coins.map(
              (coin) => {
                if (
                  coin.coinId !== "user-2-coin-1"
                ) {
                  return coin;
                }

                return {
                  ...coin,
                  area: "main",
                  progress: 45,
                  absoluteCell: 6,
                };
              }
            ),
          };
        }

        return player;
      }
    ),
  };

  // ----------------------------------------------------------
  // Red rolls 1
  // ----------------------------------------------------------

  const rolled = rollGameDice({
    game: setupGame,
    diceValue: 1,
  });

  assert.equal(
    rolled.success,
    true
  );

  // ----------------------------------------------------------
  // Red moves forward from 5 → 6
  // ----------------------------------------------------------

  const moved = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "forward",
  });

  assert.equal(
    moved.success,
    true
  );

  // ----------------------------------------------------------
  // Red reached cell 6
  // ----------------------------------------------------------

  const redPlayer =
    moved.game.players.find(
      (player) =>
        player.userId === "user-1"
    );

  const redCoin =
    redPlayer.coins.find(
      (coin) =>
        coin.coinId === "user-1-coin-1"
    );

  assert.equal(
    redCoin.area,
    "main"
  );

  assert.equal(
    redCoin.absoluteCell,
    45
  );

  // ----------------------------------------------------------
  // Green coin was killed
  // ----------------------------------------------------------

  const greenPlayer =
    moved.game.players.find(
      (player) =>
        player.userId === "user-2"
    );

  const greenCoin =
    greenPlayer.coins.find(
      (coin) =>
        coin.coinId === "user-2-coin-1"
    );

  assert.equal(
    greenCoin.area,
    "base"
  );

  assert.equal(
    greenCoin.progress,
    -1
  );

  assert.equal(
    greenCoin.absoluteCell,
    null
  );

  // ----------------------------------------------------------
  // Capture result
  // ----------------------------------------------------------

  assert.equal(
    moved.capture.killed,
    true
  );

  assert.equal(
    moved.capture.killedCoins.length,
    1
  );

  assert.equal(
    moved.capture.killedCoins[0].coinId,
    "user-2-coin-1"
  );

  // ----------------------------------------------------------
  // Kill gives extra turn
  // ----------------------------------------------------------

  assert.equal(
    moved.game.currentTurn.extraTurn,
    true
  );

  assert.equal(
    moved.game.currentTurn.extraTurnReason,
    "kill"
  );

  // Backward is disabled on the extra turn
  assert.equal(
    moved.game.currentTurn.backwardAllowed,
    true
  );

  console.log(
    "✓ forward move captures opponent"
  );
}

// ============================================================
// 42. BACKWARD MOVE CAPTURES OPPONENT
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  // ----------------------------------------------------------
  // Put Red coin at absolute cell 10
  // ----------------------------------------------------------

  const setupGame = {
    ...game,

    players: game.players.map(
      (player) => {
        if (player.userId === "user-1") {
          return {
            ...player,

            coins: player.coins.map(
              (coin) => {
                if (
                  coin.coinId !== "user-1-coin-1"
                ) {
                  return coin;
                }

                return {
                  ...coin,
                  area: "main",
                  progress: 10,
                  absoluteCell: 10,
                };
              }
            ),
          };
        }

        // ----------------------------------------------------
        // Green coin at absolute cell 7
        //
        // Green starts at 13.
        // (13 + 46) % 52 = 7
        // ----------------------------------------------------

        if (player.userId === "user-2") {
          return {
            ...player,

            coins: player.coins.map(
              (coin) => {
                if (
                  coin.coinId !== "user-2-coin-1"
                ) {
                  return coin;
                }

                return {
                  ...coin,
                  area: "main",
                  progress: 46,
                  absoluteCell: 7,
                };
              }
            ),
          };
        }

        return player;
      }
    ),
  };

  // ----------------------------------------------------------
  // Red rolls 3
  // ----------------------------------------------------------

  const rolled = rollGameDice({
    game: setupGame,
    diceValue: 3,
  });

  assert.equal(
    rolled.success,
    true
  );

  // ----------------------------------------------------------
  // Red moves backward from 10 → 7
  // ----------------------------------------------------------

  const moved = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "backward",
  });

  assert.equal(
    moved.success,
    true
  );

  // ----------------------------------------------------------
  // Red reached cell 7
  // ----------------------------------------------------------

  const redPlayer =
    moved.game.players.find(
      (player) =>
        player.userId === "user-1"
    );

  const redCoin =
    redPlayer.coins.find(
      (coin) =>
        coin.coinId === "user-1-coin-1"
    );

  assert.equal(
    redCoin.area,
    "main"
  );

  assert.equal(
    redCoin.absoluteCell,
    46
  );

  // ----------------------------------------------------------
  // Green coin was killed
  // ----------------------------------------------------------

  const greenPlayer =
    moved.game.players.find(
      (player) =>
        player.userId === "user-2"
    );

  const greenCoin =
    greenPlayer.coins.find(
      (coin) =>
        coin.coinId === "user-2-coin-1"
    );

  assert.equal(
    greenCoin.area,
    "base"
  );

  assert.equal(
    greenCoin.progress,
    -1
  );

  assert.equal(
    greenCoin.absoluteCell,
    null
  );

  // ----------------------------------------------------------
  // Capture result
  // ----------------------------------------------------------

  assert.equal(
    moved.capture.killed,
    true
  );

  assert.equal(
    moved.capture.killedCoins.length,
    1
  );

  assert.equal(
    moved.capture.killedCoins[0].coinId,
    "user-2-coin-1"
  );

  // ----------------------------------------------------------
  // Kill gives extra turn
  // ----------------------------------------------------------

  assert.equal(
    moved.game.currentTurn.extraTurn,
    true
  );

  assert.equal(
    moved.game.currentTurn.extraTurnReason,
    "kill"
  );

  // ----------------------------------------------------------
  // Backward is disabled on extra turn
  // ----------------------------------------------------------

  assert.equal(
    moved.game.currentTurn.backwardAllowed,
    false
  );

  console.log(
    "✓ backward move captures opponent"
  );
}

// ============================================================
// 43. SAFE CELL PREVENTS CAPTURE
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  // ----------------------------------------------------------
  // Put Red coin at absolute cell 7
  // ----------------------------------------------------------

  const setupGame = {
    ...game,

    players: game.players.map(
      (player) => {
        if (player.userId === "user-1") {
          return {
            ...player,

            coins: player.coins.map(
              (coin) => {
                if (
                  coin.coinId !== "user-1-coin-1"
                ) {
                  return coin;
                }

                return {
                  ...coin,
                  area: "main",
                  progress: 7,
                  absoluteCell: 7,
                };
              }
            ),
          };
        }

        // ----------------------------------------------------
        // Green coin at safe cell 8
        //
        // Green starts at 13.
        // (13 + 47) % 52 = 8
        // ----------------------------------------------------

        if (player.userId === "user-2") {
          return {
            ...player,

            coins: player.coins.map(
              (coin) => {
                if (
                  coin.coinId !== "user-2-coin-1"
                ) {
                  return coin;
                }

                return {
                  ...coin,
                  area: "main",
                  progress: 47,
                  absoluteCell: 8,
                };
              }
            ),
          };
        }

        return player;
      }
    ),
  };

  // ----------------------------------------------------------
  // Red rolls 1
  // ----------------------------------------------------------

  const rolled = rollGameDice({
    game: setupGame,
    diceValue: 1,
  });

  assert.equal(
    rolled.success,
    true
  );

  // ----------------------------------------------------------
  // Red moves forward from 7 → 8
  // ----------------------------------------------------------

  const moved = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "forward",
  });

  assert.equal(
    moved.success,
    true
  );

  // ----------------------------------------------------------
  // Red reached safe cell 8
  // ----------------------------------------------------------

  const redPlayer =
    moved.game.players.find(
      (player) =>
        player.userId === "user-1"
    );

  const redCoin =
    redPlayer.coins.find(
      (coin) =>
        coin.coinId === "user-1-coin-1"
    );

  assert.equal(
    redCoin.absoluteCell,
    47
  );

  // ----------------------------------------------------------
  // Green coin MUST NOT be killed
  // ----------------------------------------------------------

  const greenPlayer =
    moved.game.players.find(
      (player) =>
        player.userId === "user-2"
    );

  const greenCoin =
    greenPlayer.coins.find(
      (coin) =>
        coin.coinId === "user-2-coin-1"
    );

  assert.equal(
    greenCoin.area,
    "main"
  );

  assert.equal(
    greenCoin.progress,
    47
  );

  assert.equal(
    greenCoin.absoluteCell,
    8
  );

  // ----------------------------------------------------------
  // No capture should be reported
  // ----------------------------------------------------------

  assert.equal(
    moved.capture.killed,
    false
  );

  assert.equal(
    moved.capture.killedCoins.length,
    0
  );

  // ----------------------------------------------------------
  // No extra turn from capture
  // ----------------------------------------------------------

  assert.equal(
    moved.game.currentTurn.extraTurn,
    false
  );

  console.log(
    "✓ safe cell prevents capture"
  );
}

// ============================================================
// 44. CAPTURE GIVES EXTRA TURN
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  // ----------------------------------------------------------
  // Put Red coin at cell 5
  // ----------------------------------------------------------

  const setupGame = {
    ...game,

    players: game.players.map(
      (player) => {
        if (player.userId === "user-1") {
          return {
            ...player,

            coins: player.coins.map(
              (coin) => {
                if (
                  coin.coinId !== "user-1-coin-1"
                ) {
                  return coin;
                }

                return {
                  ...coin,
                  area: "main",
                  progress: 5,
                  absoluteCell: 5,
                };
              }
            ),
          };
        }

        // ----------------------------------------------------
        // Green coin at cell 6
        // ----------------------------------------------------

        if (player.userId === "user-2") {
          return {
            ...player,

            coins: player.coins.map(
              (coin) => {
                if (
                  coin.coinId !== "user-2-coin-1"
                ) {
                  return coin;
                }

                return {
                  ...coin,
                  area: "main",
                  progress: 45,
                  absoluteCell: 6,
                };
              }
            ),
          };
        }

        return player;
      }
    ),
  };

  // ----------------------------------------------------------
  // Red rolls 1
  // ----------------------------------------------------------

  const rolled = rollGameDice({
    game: setupGame,
    diceValue: 1,
  });

  assert.equal(
    rolled.success,
    true
  );

  // ----------------------------------------------------------
  // Red captures Green
  // ----------------------------------------------------------

  const moved = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "forward",
  });

  assert.equal(
    moved.success,
    true
  );

  assert.equal(
    moved.capture.killed,
    true
  );

  // ----------------------------------------------------------
  // Capture gives another turn
  // ----------------------------------------------------------

  assert.equal(
    moved.game.currentTurn.extraTurn,
    true
  );

  // ----------------------------------------------------------
  // Extra turn reason is kill
  // ----------------------------------------------------------

  assert.equal(
    moved.game.currentTurn.extraTurnReason,
    "kill"
  );

  // ----------------------------------------------------------
  // Same player keeps the turn
  // ----------------------------------------------------------

  assert.equal(
    moved.game.currentTurn.playerId,
    "user-1"
  );

  // ----------------------------------------------------------
  // Backward is disabled for the extra turn
  // ----------------------------------------------------------

  assert.equal(
    moved.game.currentTurn.backwardAllowed,
    true
  );

  console.log(
    "✓ capture gives extra turn"
  );
}

// ============================================================
// 45. ORIGINAL GAME IS NOT MUTATED BY CAPTURE
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  // ----------------------------------------------------------
  // Set up Red and Green for a capture
  // ----------------------------------------------------------

  const setupGame = {
    ...game,

    players: game.players.map(
      (player) => {
        if (player.userId === "user-1") {
          return {
            ...player,

            coins: player.coins.map(
              (coin) => {
                if (
                  coin.coinId !== "user-1-coin-1"
                ) {
                  return coin;
                }

                return {
                  ...coin,
                  area: "main",
                  progress: 5,
                  absoluteCell: 5,
                };
              }
            ),
          };
        }

        if (player.userId === "user-2") {
          return {
            ...player,

            coins: player.coins.map(
              (coin) => {
                if (
                  coin.coinId !== "user-2-coin-1"
                ) {
                  return coin;
                }

                return {
                  ...coin,
                  area: "main",
                  progress: 45,
                  absoluteCell: 6,
                };
              }
            ),
          };
        }

        return player;
      }
    ),
  };

  // ----------------------------------------------------------
  // Save the original state before the move
  // ----------------------------------------------------------

  const originalRedCoin = {
    ...setupGame.players[0].coins[0],
  };

  const originalGreenCoin = {
    ...setupGame.players[1].coins[0],
  };

  const originalMoveCount =
    setupGame.moveCount;

  // ----------------------------------------------------------
  // Red rolls 1
  // ----------------------------------------------------------

  const rolled = rollGameDice({
    game: setupGame,
    diceValue: 1,
  });

  assert.equal(
    rolled.success,
    true
  );

  // ----------------------------------------------------------
  // Red captures Green
  // ----------------------------------------------------------

  const moved = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "forward",
  });

  assert.equal(
    moved.success,
    true
  );

  assert.equal(
    moved.capture.killed,
    true
  );

  // ----------------------------------------------------------
  // Original Red coin must remain unchanged
  // ----------------------------------------------------------

  assert.deepEqual(
    setupGame.players[0].coins[0],
    originalRedCoin
  );

  // ----------------------------------------------------------
  // Original Green coin must remain unchanged
  // ----------------------------------------------------------

  assert.deepEqual(
    setupGame.players[1].coins[0],
    originalGreenCoin
  );

  // ----------------------------------------------------------
  // Original move count must remain unchanged
  // ----------------------------------------------------------

  assert.equal(
    setupGame.moveCount,
    originalMoveCount
  );

  // ----------------------------------------------------------
  // The NEW game should contain the changes
  // ----------------------------------------------------------

  const newRedCoin =
    moved.game.players[0].coins[0];

  const newGreenCoin =
    moved.game.players[1].coins[0];

  assert.equal(
    newRedCoin.absoluteCell,
    45
  );

  assert.equal(
    newGreenCoin.area,
    "base"
  );

  assert.equal(
    newGreenCoin.progress,
    -1
  );

  assert.equal(
    newGreenCoin.absoluteCell,
    null
  );

  console.log(
    "✓ original game is not mutated by capture"
  );
}

// ============================================================
// 46. SIX + FORWARD MOVE ALLOWS BACKWARD
// ============================================================

{
  const game = createInitialGameState({
    playerCount: 2,
    players: players2,
  });

  // ----------------------------------------------------------
  // Put Red coin on the main track
  // ----------------------------------------------------------

  const preparedGame = {
    ...game,

    players: game.players.map(
      (player) => {
        if (player.userId !== "user-1") {
          return player;
        }

        return {
          ...player,

          coins: player.coins.map(
            (coin, index) => {
              if (index !== 0) {
                return coin;
              }

              return {
                ...coin,
                area: "main",
                progress: 10,
                absoluteCell: 10,
              };
            }
          ),
        };
      }
    ),
  };

  // ----------------------------------------------------------
  // Player 1 rolls 6
  // ----------------------------------------------------------

  const rolled = rollGameDice({
    game: preparedGame,
    diceValue: 6,
  });

  assert.equal(
    rolled.success,
    true
  );

  // ----------------------------------------------------------
  // Before using the 6,
  // backward is allowed.
  // ----------------------------------------------------------

  assert.equal(
    rolled.game.currentTurn.backwardAllowed,
    true
  );

  // ----------------------------------------------------------
  // Move Red coin FORWARD using the 6
  // 10 → 16
  // ----------------------------------------------------------

  const moved = moveCoin({
    game: rolled.game,
    playerId: "user-1",
    coinId: "user-1-coin-1",
    direction: "forward",
  });

  assert.equal(
    moved.success,
    true
  );

  // ----------------------------------------------------------
  // Verify coin moved forward
  // ----------------------------------------------------------

  const movedCoin =
    moved.game.players[0].coins.find(
      (coin) =>
        coin.coinId === "user-1-coin-1"
    );

  assert.ok(movedCoin);

  assert.equal(
    movedCoin.area,
    "main"
  );

  assert.equal(
    movedCoin.progress,
    16
  );

  assert.equal(
    movedCoin.absoluteCell,
    3
  );

  // ----------------------------------------------------------
  // 6 + FORWARD
  // → extra turn
  // → backward IS allowed
  // ----------------------------------------------------------

  assert.equal(
    moved.game.currentTurn.extraTurn,
    true
  );

  assert.equal(
    moved.game.currentTurn.extraTurnReason,
    "six"
  );

  assert.equal(
    moved.game.currentTurn.backwardAllowed,
    true
  );

  console.log(
    "✓ six + forward allows backward on extra turn"
  );
}

// ============================================================
// FINAL RESULT
// ============================================================

console.log("\n=================================");
console.log("All game engine tests passed!");
console.log("=================================");