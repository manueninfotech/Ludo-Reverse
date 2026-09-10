// ============================================================
// REVERSE LUDO - SOCKET.IO INTEGRATION TESTS
// ============================================================

import assert from "node:assert/strict";
import http from "node:http";
import { Server } from "socket.io";
import { io as createClient } from "socket.io-client";

import { registerRoomSocket } from "../sockets/roomSocket.js";

import {
  clearRooms,
} from "./room/roomManager.js";

import {
  clearTurnTimer,
} from "./game/turnTimer.js";

console.log("Running Socket.IO integration tests...\n");

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
});

const player2 = createClient(TEST_URL, {
  transports: ["websocket"],
  forceNew: true,
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
    startResult.room.game.currentTurn
      .playerId,
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
    0
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

  ioServer.close();

  await new Promise((resolve) => {
    httpServer.close(() => {
      resolve();
    });
  });

  clearRooms();
}

// ============================================================
// FINAL RESULT
// ============================================================

console.log("\n=================================");
console.log(
  "All Socket.IO integration tests passed!"
);
console.log("=================================");