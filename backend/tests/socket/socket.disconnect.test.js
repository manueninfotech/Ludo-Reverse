// ============================================================
// REVERSE LUDO - SOCKET DISCONNECT TESTS
// ============================================================

import "dotenv/config";
process.env.NODE_ENV = "test";
import assert from "node:assert/strict";
import http from "node:http";
import { Server } from "socket.io";
import { io as createClient } from "socket.io-client";

import { registerRoomSocket } from "../../sockets/index.js";

import {
  clearRooms,
  getRoom,
} from "../../services/room/roomManager.js";

import {
  clearTurnTimer,
} from "../../services/game/turnTimer.js";

console.log("Running Socket.IO disconnect tests...\n");

// ============================================================
// HELPERS
// ============================================================

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
// TEST SERVER
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
// TEST 1
// 2 PLAYERS
// DISCONNECTED PLAYER -> REMAINING PLAYER WINS
// ============================================================

{
  clearRooms();

  const player1 =
    createClient(TEST_URL, {
      transports: ["websocket"],
      forceNew: true,
    });

  const player2 =
    createClient(TEST_URL, {
      transports: ["websocket"],
      forceNew: true,
    });

  try {
    await Promise.all([
      waitForEvent(
        player1,
        "connect"
      ),
      waitForEvent(
        player2,
        "connect"
      ),
    ]);

    // --------------------------------------------------------
    // PLAYER 1 CREATES ROOM
    // --------------------------------------------------------

    const createResult =
      await emitWithAck(
        player1,
        "create_room",
        {
          hostId: "disconnect-p1",
          hostName: "Player 1",
          hostColor: "red",
          maxPlayers: 2,
        }
      );

    assert.equal(
      createResult.success,
      true
    );

    const roomId =
      createResult.room.roomId;

    // --------------------------------------------------------
    // PLAYER 2 JOINS
    // --------------------------------------------------------

    const joinResult =
      await emitWithAck(
        player2,
        "join_room",
        {
          roomId,
          userId: "disconnect-p2",
          name: "Player 2",
          color: "green",
        }
      );

    assert.equal(
      joinResult.success,
      true
    );

    // --------------------------------------------------------
    // START GAME
    // --------------------------------------------------------

    const gameStarted =
      waitForEvent(
        player2,
        "game_started"
      );

    const startResult =
      await emitWithAck(
        player1,
        "start_game",
        {
          roomId,
          userId: "disconnect-p1",
        }
      );

    assert.equal(
      startResult.success,
      true
    );

    await gameStarted;

    // --------------------------------------------------------
    // WAIT FOR GAME FINISHED
    // --------------------------------------------------------

    const finishedEvent =
      waitForEvent(
        player1,
        "game_finished"
      );

    // Player 2 closes/exits.
    player2.disconnect();

    const finished =
      await finishedEvent;

    assert.ok(finished.game);

    assert.equal(
      finished.game.status,
      "finished"
    );

    assert.equal(
      finished.game.winnerId,
      "disconnect-p1"
    );

    assert.ok(finished.winner);

    assert.equal(
      finished.winner.userId,
      "disconnect-p1"
    );

    assert.equal(
      finished.reason,
      "opponent_disconnected"
    );

    // Verify the server's room state.
    const room = getRoom({
      roomId,
    });

    assert.ok(room);

    assert.equal(
      room.game.status,
      "finished"
    );

    assert.equal(
      room.game.winnerId,
      "disconnect-p1"
    );

    const disconnectedPlayer =
      room.game.players.find(
        (player) =>
          player.userId ===
          "disconnect-p2"
      );

    assert.ok(disconnectedPlayer);

    assert.equal(
      disconnectedPlayer.isConnected,
      false
    );

    console.log(
      "✓ 2-player disconnect gives remaining player victory"
    );

  } finally {
    clearTurnTimer({
      roomId:
        getRoom({
          roomId:
            player1.data?.roomId,
        })?.roomId,
    });

    player1.disconnect();
    player2.disconnect();
  }
}

// ============================================================
// TEST 2
// 3 PLAYERS
// DISCONNECTED PLAYER IS SKIPPED
// ============================================================

{
  clearRooms();

  const player1 =
    createClient(TEST_URL, {
      transports: ["websocket"],
      forceNew: true,
    });

  const player2 =
    createClient(TEST_URL, {
      transports: ["websocket"],
      forceNew: true,
    });

  const player3 =
    createClient(TEST_URL, {
      transports: ["websocket"],
      forceNew: true,
    });

  let roomId = null;

  try {
    await Promise.all([
      waitForEvent(
        player1,
        "connect"
      ),
      waitForEvent(
        player2,
        "connect"
      ),
      waitForEvent(
        player3,
        "connect"
      ),
    ]);

    // --------------------------------------------------------
    // PLAYER 1 CREATES 3-PLAYER ROOM
    // --------------------------------------------------------

    const createResult =
      await emitWithAck(
        player1,
        "create_room",
        {
          hostId: "three-p1",
          hostName: "Player 1",
          hostColor: "red",
          maxPlayers: 3,
        }
      );

    assert.equal(
      createResult.success,
      true
    );

    roomId =
      createResult.room.roomId;

    // --------------------------------------------------------
    // PLAYER 2 JOINS
    // --------------------------------------------------------

    const join2 =
      await emitWithAck(
        player2,
        "join_room",
        {
          roomId,
          userId: "three-p2",
          name: "Player 2",
          color: "green",
        }
      );

    assert.equal(
      join2.success,
      true
    );

    // --------------------------------------------------------
    // PLAYER 3 JOINS
    // --------------------------------------------------------

    const join3 =
      await emitWithAck(
        player3,
        "join_room",
        {
          roomId,
          userId: "three-p3",
          name: "Player 3",
          color: "yellow",
        }
      );

    assert.equal(
      join3.success,
      true
    );

    // --------------------------------------------------------
    // START GAME
    // --------------------------------------------------------

    const startResult =
      await emitWithAck(
        player1,
        "start_game",
        {
          roomId,
          userId: "three-p1",
        }
      );

    assert.equal(
      startResult.success,
      true
    );

    assert.equal(
      startResult.room.game.currentTurn
        .playerId,
      "three-p1"
    );

    // --------------------------------------------------------
    // PLAYER 2 DISCONNECTS
    // --------------------------------------------------------

    player2.disconnect();

    // Give the server a moment to process
    // the disconnect state.
    await new Promise(
      (resolve) =>
        setTimeout(resolve, 100)
    );

    const roomAfterDisconnect =
      getRoom({
        roomId,
      });

    assert.ok(
      roomAfterDisconnect
    );

    const disconnectedPlayer =
      roomAfterDisconnect.game.players.find(
        (player) =>
          player.userId === "three-p2"
      );

    assert.ok(
      disconnectedPlayer
    );

    assert.equal(
      disconnectedPlayer.isConnected,
      false
    );

    // Game must continue because
    // Player 1 and Player 3 remain.
    assert.equal(
      roomAfterDisconnect.game.status,
      "playing"
    );

    // --------------------------------------------------------
    // PLAYER 1 ROLLS 1
    //
    // All coins are in base, therefore
    // there is no legal move.
    //
    // That causes completeGameTurn().
    //
    // The next player MUST skip Player 2
    // and go to Player 3.
    // --------------------------------------------------------

    const rollResult =
  await emitWithAck(
    player1,
    "roll_dice",
    {
      roomId,
      userId: "three-p1",
      diceValue: 1,
    }
  );

assert.equal(
  rollResult.success,
  true
);

assert.equal(
  rollResult.legalMoves.length,
  0
);

// The server should immediately complete the turn
// because Player 1 has no legal move.
assert.equal(
  rollResult.turnPassed,
  true
);

assert.ok(
  rollResult.game
);

assert.equal(
  rollResult.game.status,
  "playing"
);

assert.equal(
  rollResult.game.currentTurn.playerId,
  "three-p3"
);

    // Player 2 must remain disconnected.
    const finalRoom =
      getRoom({
        roomId,
      });

    const finalPlayer2 =
      finalRoom.game.players.find(
        (player) =>
          player.userId ===
          "three-p2"
      );

    assert.ok(finalPlayer2);

    assert.equal(
      finalPlayer2.isConnected,
      false
    );

    console.log(
      "✓ 3-player game skips disconnected player"
    );

  } finally {
    clearTurnTimer({
      roomId,
    });

    player1.disconnect();
    player2.disconnect();
    player3.disconnect();
  }
}

// ============================================================
// CLEANUP
// ============================================================

clearRooms();

ioServer.close();

await new Promise((resolve) => {
  httpServer.close(() => {
    resolve();
  });
});

// ============================================================
// FINAL RESULT
// ============================================================

console.log("\n=================================");
console.log(
  "All Socket.IO disconnect tests passed!"
);
console.log("=================================");