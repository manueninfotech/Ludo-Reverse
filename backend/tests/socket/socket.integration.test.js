// ============================================================
// REVERSE LUDO - SOCKET.IO INTEGRATION TESTS
// ============================================================
import "dotenv/config";
process.env.NODE_ENV = "test";
import assert from "node:assert/strict";
import http from "node:http";
import { Server } from "socket.io";
import { io as createClient } from "socket.io-client";

import { registerRoomSocket } from "../../sockets/roomSocket.js";

import connectDB from "../../config/db.js";
import User from "../../models/User.js";


import {
  clearRooms,
  getRoom,
} from "../../services/room/roomManager.js";

import {
  clearTurnTimer,
} from "../../services/game/turnTimer.js";

console.log("Running Socket.IO integration tests...\n");
await connectDB();

await User.deleteMany({
  userId: {
    $in: [
      "socket-user-1",
      "socket-user-2",
    ],
  },
});

const testUsers = [
  {
    userId: "socket-user-1",
    username: "socketuser1",
    email: "socketuser1@test.com",
    googleId: "socket-test-google-1",
    displayName: "Socket User 1",
    coins: 1000,
  },
  {
    userId: "socket-user-2",
    username: "socketuser2",
    email: "socketuser2@test.com",
    googleId: "socket-test-google-2",
    displayName: "Socket User 2",
    coins: 1000,
  },
];

for (let i = 1; i <= 8; i++) {
  testUsers.push({
    userId: `eight-user-${i}`,
    username: `eightuser${i}`,
    email: `eightuser${i}@test.com`,
    googleId: `eight-test-google-${i}`,
    displayName: `Eight Player ${i}`,
    coins: 1000,
  });
}

await User.deleteMany({
  userId: {
    $in: testUsers.map((user) => user.userId),
  },
});

await User.create(testUsers);

console.log("✓ test users created");

// ============================================================
// TEST HELPERS
// ============================================================

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitForEvent = (
  socket,
  eventName,
  timeoutMs = 5000
) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);

      reject(
        new Error(
          `Timed out waiting for "${eventName}"`
        )
      );
    }, timeoutMs);

    const handler = (data) => {
      clearTimeout(timer);
      socket.off(eventName, handler);
      resolve(data);
    };

    socket.once(eventName, handler);
  });
};

const emitWithAck = (
  socket,
  eventName,
  data,
  timeoutMs = 5000
) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `Timed out waiting for ack from "${eventName}"`
        )
      );
    }, timeoutMs);

    socket.emit(
      eventName,
      data,
      (response) => {
        clearTimeout(timer);
        resolve(response);
      }
    );
  });
};

// ============================================================
// CREATE TEST SERVER
// ============================================================

const httpServer = http.createServer();

const ioServer = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

ioServer.on("connection", (socket) => {
  socket.data.userId =
    socket.handshake.auth.userId;

  registerRoomSocket(
    ioServer,
    socket
  );
});

await new Promise((resolve) => {
  httpServer.listen(0, "127.0.0.1", resolve);
});

const address = httpServer.address();

if (
  !address ||
  typeof address === "string"
) {
  throw new Error(
    "Could not determine test server port."
  );
}

const TEST_URL =
  `http://127.0.0.1:${address.port}`;

// ============================================================
// CONNECT TWO PLAYERS
// ============================================================

const player1 = createClient(TEST_URL, {
  transports: ["websocket"],
  forceNew: true,
  auth: {
    userId: "socket-user-1",
  },
});

const player2 = createClient(TEST_URL, {
  transports: ["websocket"],
  forceNew: true,
  auth: {
    userId: "socket-user-2",
  },
});

try {
  // ----------------------------------------------------------
  // 1. SOCKET CONNECTION
  // ----------------------------------------------------------

  await Promise.all([
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              "Player 1 connection timeout"
            )
          ),
        5000
      );

      player1.once("connect", () => {
        clearTimeout(timer);
        resolve();
      });
    }),

    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              "Player 2 connection timeout"
            )
          ),
        5000
      );

      player2.once("connect", () => {
        clearTimeout(timer);
        resolve();
      });
    }),
  ]);

  assert.ok(player1.connected);
  assert.ok(player2.connected);

  console.log(
    "✓ two players connected through Socket.IO"
  );

  // ----------------------------------------------------------
  // 2. PLAYER 1 CREATES ROOM
  // ----------------------------------------------------------

  const player1RoomUpdated =
    waitForEvent(
      player1,
      "room_updated"
    );

  const createResult =
    await emitWithAck(
      player1,
      "create_room",
      {
        hostId: "socket-user-1",
        hostName: "Player 1",
        hostColor: "red",
        maxPlayers: 2,
      }
    );

  assert.equal(
    createResult.success,
    true
  );

  assert.ok(createResult.room);
  assert.equal(
    createResult.room.hostId,
    "socket-user-1"
  );

  assert.equal(
    createResult.room.players.length,
    1
  );

  const roomId =
    createResult.room.roomId;

  assert.ok(roomId);

  await player1RoomUpdated;

  console.log(
    "✓ player 1 created room"
  );

  // ----------------------------------------------------------
  // 3. PLAYER 2 JOINS ROOM
  // ----------------------------------------------------------

  const roomUpdatedForPlayer1 =
    waitForEvent(
      player1,
      "room_updated"
    );

  const roomUpdatedForPlayer2 =
    waitForEvent(
      player2,
      "room_updated"
    );

  const joinResult =
    await emitWithAck(
      player2,
      "join_room",
      {
        roomId,
        userId: "socket-user-2",
        name: "Player 2",
        color: "green",
      }
    );

  assert.equal(
    joinResult.success,
    true
  );

  assert.equal(
    joinResult.room.players.length,
    2
  );

  await Promise.all([
    roomUpdatedForPlayer1,
    roomUpdatedForPlayer2,
  ]);

  console.log(
    "✓ player 2 joined room"
  );

  // ----------------------------------------------------------
  // 4. NON-HOST CANNOT START GAME
  // ----------------------------------------------------------

  const nonHostStartResult =
    await emitWithAck(
      player2,
      "start_game",
      {
        roomId,
        userId: "socket-user-2",
      }
    );

  assert.equal(
    nonHostStartResult.success,
    false
  );

  console.log(
    "✓ non-host cannot start game"
  );

  // ----------------------------------------------------------
// 5. HOST STARTS GAME
// ----------------------------------------------------------

const gameStartedForPlayer1 =
  waitForEvent(
    player1,
    "game_started"
  );

const gameStartedForPlayer2 =
  waitForEvent(
    player2,
    "game_started"
  );

const turnTimerEvent =
  waitForEvent(
    player1,
    "turn_timer"
  );

const startResult =
  await emitWithAck(
    player1,
    "start_game",
    {
      roomId,
      userId: "socket-user-1",
    }
  );

console.log(
  "START GAME RESULT:",
  startResult
);

assert.equal(
  startResult.success,
  true
);

assert.ok(startResult.room.game);

assert.equal(
  startResult.room.status,
  "playing"
);

assert.equal(
  startResult.room.game.currentTurn.playerId,
  "socket-user-1"
);

await Promise.all([
  gameStartedForPlayer1,
  gameStartedForPlayer2,
  turnTimerEvent,
]);

console.log(
  "✓ host started game"
);

  // ----------------------------------------------------------
  // 6. SOCKET TIMER EVENT
  // ----------------------------------------------------------

  const timerState =
    await waitForEvent(
      player2,
      "turn_timer"
    );

  assert.equal(
    timerState.roomId,
    roomId
  );

  assert.equal(
    timerState.playerId,
    "socket-user-1"
  );

  assert.ok(
    timerState.remainingSeconds >= 1 &&
    timerState.remainingSeconds <= 30
  );

  assert.ok(timerState.expiresAt);

  console.log(
    "✓ turn timer event received"
  );

  // ----------------------------------------------------------
  // 7. PLAYER 2 CANNOT ROLL
  // ----------------------------------------------------------

  const wrongPlayerRoll =
    await emitWithAck(
      player2,
      "roll_dice",
      {
        roomId,
        diceValue: 6,
      }
    );

  assert.equal(
    wrongPlayerRoll.success,
    false
  );

  console.log(
    "✓ wrong player cannot roll dice"
  );

  // ----------------------------------------------------------
  // 8. PLAYER 1 ROLLS 6
  // ----------------------------------------------------------

  const diceEventForPlayer1 =
    waitForEvent(
      player1,
      "dice_rolled"
    );

  const diceEventForPlayer2 =
    waitForEvent(
      player2,
      "dice_rolled"
    );

  const rollResult =
    await emitWithAck(
      player1,
      "roll_dice",
      {
        roomId,
        diceValue: 6,
      }
    );

  assert.equal(
    rollResult.success,
    true
  );

  assert.equal(
    rollResult.diceValue,
    6
  );

  assert.equal(
    rollResult.game.currentTurn
      .diceValue,
    6
  );

  assert.equal(
    rollResult.game.currentTurn
      .hasRolled,
    true
  );

  assert.ok(
    Array.isArray(
      rollResult.legalMoves
    )
  );

  assert.ok(
    rollResult.legalMoves.length > 0
  );

  await Promise.all([
    diceEventForPlayer1,
    diceEventForPlayer2,
  ]);

  console.log(
    "✓ player 1 rolled dice"
  );

  // ----------------------------------------------------------
  // 9. BASE COIN CAN BE MOVED ON 6
  // ----------------------------------------------------------

  const legalBaseMove =
    rollResult.legalMoves.find(
      (move) =>
        move.coinId ===
          "socket-user-1-coin-1" &&
        move.direction === "forward"
    );

  assert.ok(
    legalBaseMove,
    "Expected first base coin to have a forward move"
  );

  // ----------------------------------------------------------
  // 10. PLAYER 1 MOVES COIN
  // ----------------------------------------------------------

  const coinMovedForPlayer1 =
    waitForEvent(
      player1,
      "coin_moved"
    );

  const coinMovedForPlayer2 =
    waitForEvent(
      player2,
      "coin_moved"
    );

  const turnChangedForPlayer1 =
    waitForEvent(
      player1,
      "turn_changed"
    );

  const moveResult =
    await emitWithAck(
      player1,
      "move_coin",
      {
        roomId,
        userId: "socket-user-1",
        coinId:
          "socket-user-1-coin-1",
        direction: "forward",
      }
    );

  assert.equal(
    moveResult.success,
    true
  );

  assert.ok(moveResult.game);

  const movedCoin =
    moveResult.game.players[0].coins.find(
      (coin) =>
        coin.coinId ===
        "socket-user-1-coin-1"
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

  await Promise.all([
    coinMovedForPlayer1,
    coinMovedForPlayer2,
    turnChangedForPlayer1,
  ]);

  // Because the coin entered the board
  // using a 6, this produces the
  // configured extra turn.
  assert.equal(
    moveResult.game.currentTurn
      .playerId,
    "socket-user-1"
  );

  assert.equal(
    moveResult.game.currentTurn
      .extraTurn,
    true
  );

  console.log(
    "✓ player 1 moved coin through socket"
  );

  // ----------------------------------------------------------
  // 11. EXTRA TURN TIMER STARTED
  // ----------------------------------------------------------

  const extraTimerEvent =
    await waitForEvent(
      player2,
      "turn_timer"
    );

  assert.equal(
    extraTimerEvent.playerId,
    "socket-user-1"
  );

  assert.ok(
    extraTimerEvent.remainingSeconds >= 1 &&
    extraTimerEvent.remainingSeconds <= 30
  );

  console.log(
    "✓ extra turn timer started"
  );

  // ----------------------------------------------------------
  // CLEAN TIMER
  // ----------------------------------------------------------

  clearTurnTimer({
    roomId,
  });

  console.log(
    "✓ active game timer cleaned up"
  );

} finally {
  // ----------------------------------------------------------
  // CLEANUP
  // ----------------------------------------------------------

  clearTurnTimer({
    roomId: undefined,
  });

  player1.disconnect();
  player2.disconnect();

  clearRooms();
}

// ============================================================
// 12. EIGHT PLAYER SOCKET.IO TEST
// ============================================================

{
  const players = [];

  for (let i = 1; i <= 8; i++) {
    const player = createClient(TEST_URL, {
      transports: ["websocket"],
      forceNew: true,
      auth: {
        userId: `eight-user-${i}`,
      },
    });

    players.push(player);
  }

  try {
    // ----------------------------------------------------------
    // CONNECT ALL 8 PLAYERS
    // ----------------------------------------------------------

    await Promise.all(
  players.map(
    (player, index) =>
      new Promise((resolve, reject) => {
        if (player.connected) {
          resolve();
          return;
        }

        const timeout = setTimeout(() => {
          reject(
            new Error(
              `8-player connection timeout for player ${index + 1}`
            )
          );
        }, 10000);

        player.once("connect", () => {
          clearTimeout(timeout);
          resolve();
        });

        player.once("connect_error", (error) => {
          clearTimeout(timeout);

          console.error(
            `Player ${index + 1} connection error:`,
            error.message
          );

          reject(error);
        });
      })
  )
);

    players.forEach((player) => {
      assert.ok(player.connected);
    });

    console.log(
      "✓ 8 players connected through Socket.IO"
    );

    // ----------------------------------------------------------
    // CREATE 8-PLAYER ROOM
    // ----------------------------------------------------------

    const createResult = await emitWithAck(
      players[0],
      "create_room",
      {
        hostId: "eight-user-1",
        hostName: "Player 1",
        hostColor: "red",
        maxPlayers: 8,
      }
    );

    assert.equal(
      createResult.success,
      true
    );

    const roomId =
      createResult.room.roomId;

    assert.equal(
      createResult.room.maxPlayers,
      8
    );

    assert.equal(
      createResult.room.players.length,
      1
    );

    console.log(
      "✓ 8-player room created"
    );

    // ----------------------------------------------------------
    // JOIN PLAYERS 2-8
    // ----------------------------------------------------------

    for (let i = 2; i <= 8; i++) {
      const joinResult =
        await emitWithAck(
          players[i - 1],
          "join_room",
          {
            roomId,
            userId: `eight-user-${i}`,
            name: `Player ${i}`,
          }
        );

      assert.equal(
        joinResult.success,
        true
      );
    }

    console.log(
      "✓ players 2-8 joined 8-player room"
    );

    // ----------------------------------------------------------
    // VERIFY ROOM HAS 8 PLAYERS
    // ----------------------------------------------------------

    const roomState =
      await emitWithAck(
        players[0],
        "resume_room",
        {
          roomId,
          userId: "eight-user-1",
        }
      );

    assert.equal(
      roomState.success,
      true
    );

    assert.equal(
      roomState.room.players.length,
      8
    );

    assert.equal(
      roomState.room.maxPlayers,
      8
    );

    console.log(
      "✓ 8-player room contains all players"
    );

    // ----------------------------------------------------------
// START 8-PLAYER GAME
// ----------------------------------------------------------

const gameStartedEvents = players.map((player) =>
  waitForEvent(player, "game_started")
);

const firstTurnTimer = waitForEvent(
  players[0],
  "turn_timer"
);

const startGameResult = await emitWithAck(
  players[0],
  "start_game",
  {
    roomId,
    userId: "eight-user-1",
  }
);

assert.equal(
  startGameResult.success,
  true
);

assert.ok(startGameResult.room);
assert.equal(
  startGameResult.room.status,
  "playing"
);

assert.ok(startGameResult.room.game);

assert.equal(
  startGameResult.room.game.playerCount,
  8
);

assert.equal(
  startGameResult.room.game.boardType,
  "eight-player"
);

assert.equal(
  startGameResult.room.game.players.length,
  8
);

assert.equal(
  startGameResult.room.game.currentTurn.playerId,
  "eight-user-1"
);

await Promise.all([
  ...gameStartedEvents,
  firstTurnTimer,
]);

console.log(
  "✓ 8-player game started through Socket.IO"
);

console.log(
  "✓ 8-player game uses eight-player board"
);

console.log(
  "✓ all 8 players received game_started"
);
// ----------------------------------------------------------
// PLAYER 1 ROLLS DICE
// ----------------------------------------------------------

const diceEvents = players.map((player) =>
  waitForEvent(player, "dice_rolled")
);

const rollResult = await emitWithAck(
  players[0],
  "roll_dice",
  {
    roomId,
    diceValue: 6,
  }
);

assert.equal(
  rollResult.success,
  true
);

assert.equal(
  rollResult.diceValue,
  6
);

assert.ok(rollResult.game);

assert.equal(
  rollResult.game.currentTurn.playerId,
  "eight-user-1"
);

assert.equal(
  rollResult.game.currentTurn.diceValue,
  6
);

assert.equal(
  rollResult.game.currentTurn.hasRolled,
  true
);

assert.ok(
  Array.isArray(rollResult.legalMoves)
);

assert.ok(
  rollResult.legalMoves.length > 0
);

await Promise.all(diceEvents);

console.log(
  "✓ player 1 rolled dice in 8-player game"
);

console.log(
  "✓ all 8 players received dice_rolled"
);

// ----------------------------------------------------------
// PLAYER 1 MOVES COIN
// ----------------------------------------------------------

const legalBaseMove = rollResult.legalMoves.find(
  (move) =>
    move.coinId === "eight-user-1-coin-1" &&
    move.direction === "forward"
);

assert.ok(
  legalBaseMove,
  "Expected first base coin to have a forward move"
);

const coinMovedEvents = players.map((player) =>
  waitForEvent(player, "coin_moved")
);

const moveResult = await emitWithAck(
  players[0],
  "move_coin",
  {
    roomId,
    userId: "eight-user-1",
    coinId: "eight-user-1-coin-1",
    direction: "forward",
  }
);

assert.equal(
  moveResult.success,
  true
);

assert.ok(moveResult.game);

const movedPlayer = moveResult.game.players.find(
  (player) => player.userId === "eight-user-1"
);

assert.ok(movedPlayer);

const movedCoin = movedPlayer.coins.find(
  (coin) => coin.coinId === "eight-user-1-coin-1"
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
  0
);

await Promise.all(coinMovedEvents);

console.log(
  "✓ player 1 moved coin through 8-player socket game"
);

console.log(
  "✓ 8-player coin entered at the correct start cell"
);

// ----------------------------------------------------------
// VERIFY EXTRA TURN
// ----------------------------------------------------------

assert.equal(
  moveResult.game.currentTurn.playerId,
  "eight-user-1"
);

assert.equal(
  moveResult.game.currentTurn.extraTurn,
  true
);

console.log(
  "✓ player 1 received extra turn in 8-player game"
);

// ----------------------------------------------------------
// PLAYER 1 USES EXTRA TURN
// ----------------------------------------------------------

const secondDiceEvents = players.map((player) =>
  waitForEvent(player, "dice_rolled")
);

const secondRollResult = await emitWithAck(
  players[0],
  "roll_dice",
  {
    roomId,
    diceValue: 4,
  }
);

assert.equal(
  secondRollResult.success,
  true
);

assert.equal(
  secondRollResult.diceValue,
  4
);

assert.equal(
  secondRollResult.game.currentTurn.playerId,
  "eight-user-1"
);

await Promise.all(secondDiceEvents);

console.log(
  "✓ player 1 used the extra turn"
);

// ----------------------------------------------------------
// PLAYER 1 MOVES AGAIN
// ----------------------------------------------------------

const secondCoinMovedEvents = players.map((player) =>
  waitForEvent(player, "coin_moved")
);

const secondTurnChangedEvents = players.map((player) =>
  waitForEvent(player, "turn_changed")
);

const secondMoveResult = await emitWithAck(
  players[0],
  "move_coin",
  {
    roomId,
    userId: "eight-user-1",
    coinId: "eight-user-1-coin-1",
    direction: "forward",
  }
);

assert.equal(
  secondMoveResult.success,
  true
);

assert.ok(secondMoveResult.game);

assert.equal(
  secondMoveResult.game.currentTurn.extraTurn,
  false
);

const turnChangedResults = await Promise.all([
  ...secondCoinMovedEvents,
  ...secondTurnChangedEvents,
]);

const actualTurnChangedEvents =
  turnChangedResults.filter(
    (event) =>
      event?.game?.currentTurn &&
      !event.coinId
  );

assert.ok(
  actualTurnChangedEvents.length > 0,
  "Expected a turn_changed event"
);

assert.equal(
  actualTurnChangedEvents[0].game.currentTurn.playerId,
  "eight-user-2"
);

assert.equal(
  actualTurnChangedEvents[0].game.currentTurn.extraTurn,
  false
);

console.log(
  "✓ player 1 moved again"
);

console.log(
  "✓ turn correctly passed to player 2"
);

// ----------------------------------------------------------
// 8-PLAYER CAPTURE TEST
// ----------------------------------------------------------

// Get the live room/game used by the socket handlers.
const liveRoom = getRoom({
  roomId: roomId.trim().toUpperCase(),
});

assert.ok(liveRoom);
assert.ok(liveRoom.game);

const game = liveRoom.game;

// Player 1 coin is currently at progress 4.
// On the 8-player board, red starts at absolute cell 0,
// so its absolute cell is also 4.
const player1 = game.players.find(
  (player) => player.userId === "eight-user-1"
);

const player2 = game.players.find(
  (player) => player.userId === "eight-user-2"
);

assert.ok(player1);
assert.ok(player2);

const player1Coin = player1.coins.find(
  (coin) => coin.coinId === "eight-user-1-coin-1"
);

const player2Coin = player2.coins.find(
  (coin) => coin.coinId === "eight-user-2-coin-1"
);

assert.ok(player1Coin);
assert.ok(player2Coin);

// Player 2 is green and starts at absolute cell 12.
// Progress 87 => (12 + 87) % 96 = 3.
// Rolling 1 will therefore land on absolute cell 4,
// exactly where Player 1's coin is located.
player2Coin.area = "main";
player2Coin.progress = 87;
player2Coin.absoluteCell = 3;

console.log(
  "✓ capture position prepared for 8-player game"
);

// ----------------------------------------------------------
// PLAYER 2 ROLLS 1
// ----------------------------------------------------------

const captureDiceEvents = players.map((player) =>
  waitForEvent(player, "dice_rolled")
);

const captureRollResult = await emitWithAck(
  players[1],
  "roll_dice",
  {
    roomId,
    diceValue: 1,
  }
);

assert.equal(
  captureRollResult.success,
  true
);

assert.equal(
  captureRollResult.diceValue,
  1
);

assert.equal(
  captureRollResult.game.currentTurn.playerId,
  "eight-user-2"
);

const captureLegalMove = captureRollResult.legalMoves.find(
  move =>
    move.coinId === "eight-user-2-coin-1" &&
    move.direction === "forward"
);

assert.ok(captureLegalMove);
assert.equal(captureLegalMove.fromAbsoluteCell, 3);
assert.equal(captureLegalMove.toAbsoluteCell, 4);

await Promise.all(captureDiceEvents);

console.log(
  "✓ player 2 rolled for capture"
);



// ----------------------------------------------------------
// PLAYER 2 CAPTURES PLAYER 1
// ----------------------------------------------------------

const captureCoinEvents = players.map((player) =>
  waitForEvent(player, "coin_moved")
);

const captureMoveResult = await emitWithAck(
  players[1],
  "move_coin",
  {
    roomId,
    userId: "eight-user-2",
    coinId: "eight-user-2-coin-1",
    direction: "forward",
  }
);

assert.equal(
  captureMoveResult.success,
  true
);

assert.ok(captureMoveResult.game);

const capturedPlayer = captureMoveResult.game.players.find(
  (player) => player.userId === "eight-user-1"
);

assert.ok(capturedPlayer);

const capturedCoin = capturedPlayer.coins.find(
  (coin) => coin.coinId === "eight-user-1-coin-1"
);

assert.ok(capturedCoin);

assert.equal(capturedCoin.area, "base");
assert.equal(capturedCoin.progress, -1);
assert.equal(capturedCoin.absoluteCell, null);

await Promise.all(captureCoinEvents);

console.log(
  "✓ player 2 captured player 1's coin in 8-player game"
);

  } finally {
    players.forEach((player) => {
      if (player.connected) {
        player.disconnect();
      }
    });
  }
}

// ============================================================
// FINAL RESULT
// ============================================================

ioServer.close();

await new Promise((resolve) => {
  httpServer.close(() => {
    resolve();
  });
});

console.log("\n=================================");
console.log(
  "All Socket.IO integration tests passed!"
);
console.log("=================================");