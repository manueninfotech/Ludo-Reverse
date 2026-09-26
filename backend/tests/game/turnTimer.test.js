// ============================================================
// REVERSE LUDO - TURN TIMER TESTS
// ============================================================

import assert from "node:assert/strict";

import {
  createInitialGameState,
} from "../../services/game/gameEngine.js";

import {
  startTurnTimer,
  clearTurnTimer,
  handleTurnTimeout,
} from "../../services/game/turnTimer.js";

console.log("Running turn timer tests...\n");

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

// ============================================================
// MOCK SOCKET.IO
// ============================================================

const createMockIO = () => {
  const emittedEvents = [];

  return {
    emittedEvents,

    to(roomId) {
      return {
        emit(eventName, data) {
          emittedEvents.push({
            roomId,
            eventName,
            data,
          });
        },
      };
    },
  };
};

// ============================================================
// MOCK ROOM
// ============================================================

const createRoom = () => {
  return {
    roomId: "TEST-ROOM",
    hostId: "user-1",
    maxPlayers: 2,
    status: "playing",
    players: players2.map((player) => ({
      ...player,
      isHost: player.userId === "user-1",
      isConnected: true,
    })),
    game: createInitialGameState({
      playerCount: 2,
      players: players2,
    }),
  };
};

// ============================================================
// HELPER - SET COIN ON MAIN TRACK
// ============================================================

const placeCoinOnMain = ({
  game,
  playerId,
  coinIndex = 0,
  progress,
}) => {
  return {
    ...game,

    players: game.players.map((player) => {
      if (player.userId !== playerId) {
        return player;
      }

      return {
        ...player,

        coins: player.coins.map((coin, index) => {
          if (index !== coinIndex) {
            return coin;
          }

          return {
            ...coin,
            area: "main",
            progress,
            absoluteCell: progress,
          };
        }),
      };
    }),
  };
};

// ============================================================
// 1. START TURN TIMER
// ============================================================

{
  const io = createMockIO();
  const room = createRoom();

  startTurnTimer({
    io,
    room,
  });

  assert.ok(room.game.currentTurn.turnExpiresAt);

  const timerEvent = io.emittedEvents.find(
    (event) => event.eventName === "turn_timer"
  );

  assert.ok(timerEvent);

  assert.equal(
    timerEvent.data.roomId,
    room.roomId
  );

  assert.equal(
    timerEvent.data.playerId,
    "user-1"
  );

  assert.equal(
    timerEvent.data.remainingSeconds,
    30
  );

  clearTurnTimer({
    roomId: room.roomId,
  });

  console.log("✓ start turn timer");
}

// ============================================================
// 2. CLEAR TURN TIMER
// ============================================================

{
  const io = createMockIO();
  const room = createRoom();

  startTurnTimer({
    io,
    room,
  });

  clearTurnTimer({
    roomId: room.roomId,
  });

  // Calling clear again should safely do nothing.
  clearTurnTimer({
    roomId: room.roomId,
  });

  console.log("✓ clear turn timer");
}

// ============================================================
// 3. TIMEOUT AUTO-ROLLS WHEN PLAYER HAS NOT ROLLED
// ============================================================

{
  const io = createMockIO();
  const room = createRoom();

  room.game = placeCoinOnMain({
    game: room.game,
    playerId: "user-1",
    progress: 10,
  });

  const originalRandom = Math.random;

  try {
    // Math.random() = 0.5 → dice = 4
    Math.random = () => 0.5;

    const expiresAt = new Date();

    room.game = {
      ...room.game,
      currentTurn: {
        ...room.game.currentTurn,
        hasRolled: false,
        turnExpiresAt: expiresAt,
      },
    };

    await handleTurnTimeout({
      io,
      room,
      playerId: "user-1",
      expiresAt,
    });

    const diceEvent = io.emittedEvents.find(
      (event) => event.eventName === "dice_rolled"
    );

    assert.ok(diceEvent);

    assert.equal(
      diceEvent.data.diceValue,
      4
    );

    assert.equal(
      diceEvent.data.auto,
      true
    );

    assert.ok(
      Array.isArray(diceEvent.data.legalMoves)
    );

    console.log(
      "✓ timeout automatically rolls dice"
    );
  } finally {
    Math.random = originalRandom;

    clearTurnTimer({
      roomId: room.roomId,
    });
  }
}

// ============================================================
// 4. AUTO-ROLL WITH NO LEGAL MOVES PASSES TURN
// ============================================================

{
  const io = createMockIO();
  const room = createRoom();

  const originalRandom = Math.random;

  try {
    // Dice 4.
    // All coins are in base, so no legal move exists.
    Math.random = () => 0.5;

    const expiresAt = new Date();

    room.game = {
      ...room.game,
      currentTurn: {
        ...room.game.currentTurn,
        hasRolled: false,
        turnExpiresAt: expiresAt,
      },
    };

    await handleTurnTimeout({
      io,
      room,
      playerId: "user-1",
      expiresAt,
    });

    assert.equal(
      room.game.currentTurn.playerId,
      "user-2"
    );

    const turnChangedEvent =
      io.emittedEvents.find(
        (event) =>
          event.eventName === "turn_changed"
      );

    assert.ok(turnChangedEvent);

    assert.equal(
      turnChangedEvent.data.auto,
      true
    );

    console.log(
      "✓ no legal move automatically passes turn"
    );
  } finally {
    Math.random = originalRandom;

    clearTurnTimer({
      roomId: room.roomId,
    });
  }
}

// ============================================================
// 5. ONE LEGAL COIN AUTO-MOVES
// ============================================================

{
  const io = createMockIO();
  const room = createRoom();

  room.game = placeCoinOnMain({
    game: room.game,
    playerId: "user-1",
    progress: 10,
  });

  const originalRandom = Math.random;

  try {
    // Dice 4.
    Math.random = () => 0.5;

    const expiresAt = new Date();

    room.game = {
      ...room.game,
      currentTurn: {
        ...room.game.currentTurn,
        hasRolled: false,
        turnExpiresAt: expiresAt,
      },
    };

    await handleTurnTimeout({
      io,
      room,
      playerId: "user-1",
      expiresAt,
    });

    const movedCoin =
      room.game.players[0].coins.find(
        (coin) =>
          coin.coinId === "user-1-coin-1"
      );

    assert.ok(movedCoin);

    assert.equal(
      movedCoin.progress,
      14
    );

    assert.equal(
      movedCoin.area,
      "main"
    );

    const moveEvent =
      io.emittedEvents.find(
        (event) =>
          event.eventName === "coin_moved"
      );

    assert.ok(moveEvent);

    assert.equal(
      moveEvent.data.auto,
      true
    );

    assert.equal(
      moveEvent.data.coinId,
      "user-1-coin-1"
    );

    assert.equal(
      moveEvent.data.direction,
      "forward"
    );

    // Normal move passes to next player.
    assert.equal(
      room.game.currentTurn.playerId,
      "user-2"
    );

    console.log(
      "✓ one legal coin automatically moves"
    );
  } finally {
    Math.random = originalRandom;

    clearTurnTimer({
      roomId: room.roomId,
    });
  }
}

// ============================================================
// 6. MULTIPLE COINS ON SAME CELL AUTO-MOVE
// ============================================================

{
  const io = createMockIO();
  const room = createRoom();

  room.game = placeCoinOnMain({
    game: room.game,
    playerId: "user-1",
    coinIndex: 0,
    progress: 10,
  });

  room.game = placeCoinOnMain({
    game: room.game,
    playerId: "user-1",
    coinIndex: 1,
    progress: 10,
  });

  const originalRandom = Math.random;

  try {
    // Dice 3.
    Math.random = () => 0.4;

    const expiresAt = new Date();

    room.game = {
      ...room.game,
      currentTurn: {
        ...room.game.currentTurn,
        hasRolled: false,
        turnExpiresAt: expiresAt,
      },
    };

    await handleTurnTimeout({
      io,
      room,
      playerId: "user-1",
      expiresAt,
    });

    const player =
      room.game.players.find(
        (player) =>
          player.userId === "user-1"
      );

    const coin1 = player.coins.find(
      (coin) =>
        coin.coinId === "user-1-coin-1"
    );

    const coin2 = player.coins.find(
      (coin) =>
        coin.coinId === "user-1-coin-2"
    );

    assert.ok(coin1);
    assert.ok(coin2);

    // One of the two same-cell coins should move.
    assert.ok(
      coin1.progress === 13 ||
      coin2.progress === 13
    );

    const moveEvent =
      io.emittedEvents.find(
        (event) =>
          event.eventName === "coin_moved"
      );

    assert.ok(moveEvent);

    assert.equal(
      moveEvent.data.auto,
      true
    );

    console.log(
      "✓ multiple coins on same cell auto-move"
    );
  } finally {
    Math.random = originalRandom;

    clearTurnTimer({
      roomId: room.roomId,
    });
  }
}

// ============================================================
// 7. AUTO-ROLL ALSO AUTO-MOVES WHEN COINS ARE ON DIFFERENT CELLS
// ============================================================

{
  const io = createMockIO();
  const room = createRoom();

  room.game = placeCoinOnMain({
    game: room.game,
    playerId: "user-1",
    coinIndex: 0,
    progress: 10,
  });

  room.game = placeCoinOnMain({
    game: room.game,
    playerId: "user-1",
    coinIndex: 1,
    progress: 20,
  });

  const originalRandom = Math.random;

  try {
    // Dice 3.
    Math.random = () => 0.4;

    const expiresAt = new Date();

    room.game = {
      ...room.game,
      currentTurn: {
        ...room.game.currentTurn,
        hasRolled: false,
        turnExpiresAt: expiresAt,
      },
    };

    await handleTurnTimeout({
      io,
      room,
      playerId: "user-1",
      expiresAt,
    });

    const player =
      room.game.players.find(
        (player) =>
          player.userId === "user-1"
      );

    const coin1 = player.coins.find(
      (coin) =>
        coin.coinId === "user-1-coin-1"
    );

    const coin2 = player.coins.find(
      (coin) =>
        coin.coinId === "user-1-coin-2"
    );

    // Auto-roll = 3.
    // Automatic move chooses the first legal forward move.
    assert.equal(
      coin1.progress,
      13
    );

    // Second coin was not selected.
    assert.equal(
      coin2.progress,
      20
    );

    // Turn should pass to the next player.
    assert.notEqual(
      room.game.currentTurn.playerId,
      "user-1"
    );

    assert.equal(
      room.game.currentTurn.hasRolled,
      false
    );

    // Next player's roll timer should be active.
    assert.ok(
      room.game.currentTurn.turnExpiresAt
    );

    // Automatic movement should have happened.
    const moveEvent =
      io.emittedEvents.find(
        (event) =>
          event.eventName === "coin_moved"
      );

    assert.ok(moveEvent);

    assert.equal(
      moveEvent.data.auto,
      true
    );

    console.log(
      "✓ auto-roll automatically moves a coin even when coins are on different cells"
    );
  } finally {
    Math.random = originalRandom;

    clearTurnTimer({
      roomId: room.roomId,
    });
  }
}

// ============================================================
// 8. MOVEMENT TIMEOUT AUTO-MOVES
// ============================================================

{
  const io = createMockIO();
  const room = createRoom();

  room.game = placeCoinOnMain({
    game: room.game,
    playerId: "user-1",
    progress: 10,
  });

  const expiresAt = new Date();

  room.game = {
    ...room.game,
    currentTurn: {
      ...room.game.currentTurn,
      hasRolled: true,
      diceValue: 4,
      turnExpiresAt: expiresAt,
    },
  };

  try {
    await handleTurnTimeout({
      io,
      room,
      playerId: "user-1",
      expiresAt,
    });

    const movedCoin =
      room.game.players[0].coins.find(
        (coin) =>
          coin.coinId === "user-1-coin-1"
      );

    assert.ok(movedCoin);

    assert.equal(
      movedCoin.progress,
      14
    );

    assert.equal(
      movedCoin.area,
      "main"
    );

    const moveEvent =
      io.emittedEvents.find(
        (event) =>
          event.eventName === "coin_moved"
      );

    assert.ok(moveEvent);

    assert.equal(
      moveEvent.data.auto,
      true
    );

    assert.equal(
      room.game.currentTurn.playerId,
      "user-2"
    );

    console.log(
      "✓ movement timeout automatically moves coin"
    );
  } finally {
    clearTurnTimer({
      roomId: room.roomId,
    });
  }
}

// ============================================================
// 9. STALE TIMER IS IGNORED
// ============================================================

{
  const io = createMockIO();
  const room = createRoom();

  const actualExpiresAt = new Date(
    Date.now() + 10000
  );

  const staleExpiresAt = new Date(
    Date.now() - 10000
  );

  room.game = {
    ...room.game,
    currentTurn: {
      ...room.game.currentTurn,
      hasRolled: false,
      turnExpiresAt: actualExpiresAt,
    },
  };

  await handleTurnTimeout({
    io,
    room,
    playerId: "user-1",
    expiresAt: staleExpiresAt,
  });

  assert.equal(
    io.emittedEvents.length,
    0
  );

  assert.equal(
    room.game.currentTurn.hasRolled,
    false
  );

  console.log(
    "✓ stale timer is ignored"
  );
}

// ============================================================
// 9. FIVE MISSED TURNS AUTO-DISCONNECT PLAYER
// ============================================================

{
  const io = createMockIO();
  const room = createRoom();

  const originalRandom = Math.random;

  try {
    Math.random = () => 0.5;

    for (let miss = 1; miss <= 5; miss++) {
      const expiresAt = new Date();

      room.game = {
        ...room.game,
        currentTurn: {
          ...room.game.currentTurn,
          playerId: "user-1",
          hasRolled: false,
          diceValue: null,
          turnExpiresAt: expiresAt,
        },
      };

      await handleTurnTimeout({
        io,
        room,
        playerId: "user-1",
        expiresAt,
      });

      const player =
        room.game.players.find(
          (player) =>
            player.userId === "user-1"
        );

      assert.equal(
        player.missedTurns,
        miss
      );

      if (miss < 5) {
        assert.equal(
          player.isConnected,
          true
        );
      }
    }

    const player =
      room.game.players.find(
        (player) =>
          player.userId === "user-1"
      );

    assert.equal(
      player.missedTurns,
      5
    );

    assert.equal(
      player.isConnected,
      false
    );

    assert.equal(
      room.game.status,
      "finished"
    );

    assert.equal(
      room.game.winnerId,
      "user-2"
    );

    const gameFinishedEvent =
      io.emittedEvents.find(
        (event) =>
          event.eventName === "game_finished"
      );

    assert.ok(gameFinishedEvent);

    assert.equal(
      gameFinishedEvent.data.reason,
      "player_auto_disconnected"
    );

    console.log(
      "✓ player is automatically disconnected after 5 missed turns"
    );
  } finally {
    Math.random = originalRandom;

    clearTurnTimer({
      roomId: room.roomId,
    });
  }
}

// ============================================================
// 10. FIVE MISSED TURNS IN 3-PLAYER GAME SKIPS PLAYER
// ============================================================

{
  const io = createMockIO();
  const room = createRoom();

  const players3 = [
    {
      userId: "user-1",
      name: "Player 1",
      color: "red",
      isReady: true,
      isConnected: true,
    },
    {
      userId: "user-2",
      name: "Player 2",
      color: "green",
      isReady: true,
      isConnected: true,
    },
    {
      userId: "user-3",
      name: "Player 3",
      color: "yellow",
      isReady: true,
      isConnected: true,
    },
  ];

  room.players = players3;

  room.game = createInitialGameState({
    playerCount: 3,
    players: players3,
  });

  const originalRandom = Math.random;

  try {
    Math.random = () => 0.5;

    for (let miss = 1; miss <= 5; miss++) {
      const expiresAt = new Date();

      room.game = {
        ...room.game,
        currentTurn: {
          ...room.game.currentTurn,
          playerId: "user-1",
          hasRolled: false,
          diceValue: null,
          turnExpiresAt: expiresAt,
        },
      };

      await handleTurnTimeout({
        io,
        room,
        playerId: "user-1",
        expiresAt,
      });

      const player1 =
        room.game.players.find(
          (player) =>
            player.userId === "user-1"
        );

      assert.equal(
        player1.missedTurns,
        miss
      );

      if (miss < 5) {
        assert.equal(
          player1.isConnected,
          true
        );
      }
    }

    const player1 =
      room.game.players.find(
        (player) =>
          player.userId === "user-1"
      );

    assert.equal(
      player1.missedTurns,
      5
    );

    assert.equal(
      player1.isConnected,
      false
    );

    // Game must continue because this is a 3-player game.
    assert.equal(
      room.game.status,
      "playing"
    );

    // Disconnected player must be skipped.
    assert.notEqual(
      room.game.currentTurn.playerId,
      "user-1"
    );

    // Player 2 is the next connected player.
    assert.equal(
      room.game.currentTurn.playerId,
      "user-2"
    );

    assert.equal(
      room.game.currentTurn.hasRolled,
      false
    );

    assert.ok(
      room.game.currentTurn.turnExpiresAt
    );

    const disconnectEvent =
      io.emittedEvents.find(
        (event) =>
          event.eventName ===
          "player_disconnected"
      );

    assert.ok(disconnectEvent);

    assert.equal(
      disconnectEvent.data.playerId,
      "user-1"
    );

    assert.equal(
      disconnectEvent.data.reason,
      "miss_limit_reached"
    );

    const turnChangedEvent =
      io.emittedEvents.find(
        (event) =>
          event.eventName ===
          "turn_changed"
      );

    assert.ok(turnChangedEvent);

    assert.equal(
      turnChangedEvent.data.game.currentTurn.playerId,
      "user-2"
    );

    console.log(
      "✓ 3-player game skips player after 5 missed turns"
    );
  } finally {
    Math.random = originalRandom;

    clearTurnTimer({
      roomId: room.roomId,
    });
  }
}

// ============================================================
// FINAL RESULT
// ============================================================

console.log("\n=================================");
console.log("All turn timer tests passed!");
console.log("=================================");