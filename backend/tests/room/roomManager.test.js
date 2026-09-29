import assert from "node:assert/strict";

import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  canStartGame,
  startGame,
  getRooms,
  clearRooms,
} from "../../services/room/roomManager.js";

console.log("Running room manager tests...");

clearRooms();


// ============================================================
// TEST DATA
// ============================================================

const host = {
  userId: "user-1",
  name: "Player 1",
  color: "red",
};

const player2 = {
  userId: "user-2",
  name: "Player 2",
  color: "green",
};


// ============================================================
// 1. CREATE ROOM
// ============================================================

{
  const result = createRoom({
    hostId: host.userId,
    hostName: host.name,
    hostColor: host.color,
    maxPlayers: 2,
  });

  assert.equal(result.success, true);
  assert.ok(result.room.roomId);

  console.log("✓ room created");
}


// ============================================================
// 2. GET ROOM
// ============================================================

let roomId;

{
  const room = getRooms()[0];

  roomId = room.roomId;

  const found = getRoom({
    roomId,
  });

  assert.ok(found);
  assert.equal(found.roomId, roomId);

  console.log("✓ room retrieved");
}


// ============================================================
// 3. JOIN ROOM
// ============================================================

{
  const result = joinRoom({
    roomId,
    userId: player2.userId,
    name: player2.name,
    color: player2.color,
  });

  assert.equal(result.success, true);
  assert.equal(
    result.room.players.length,
    2
  );

  console.log("✓ player joined room");
}


// ============================================================
// 4. DUPLICATE PLAYER REJECTED
// ============================================================

{
  const result = joinRoom({
    roomId,
    userId: player2.userId,
    name: player2.name,
    color: player2.color,
  });

  assert.equal(result.success, false);

  console.log("✓ duplicate player rejected");
}


// ============================================================
// 5. ROOM FULL
// ============================================================

{
  const result = joinRoom({
    roomId,
    userId: "user-3",
    name: "Player 3",
    color: "yellow",
  });

  assert.equal(result.success, false);

  console.log("✓ full room rejected new player");
}


// ============================================================
// 6. CAN START GAME
// ============================================================

{
  const result = canStartGame({
    roomId,
  });

  assert.equal(result.canStart, true);

  console.log("✓ game can start");
}


// ============================================================
// 7. NON HOST CANNOT START
// ============================================================

{
  const result = startGame({
    roomId,
    userId: player2.userId,
  });

  assert.equal(result.success, false);

  console.log("✓ non-host cannot start game");
}


// ============================================================
// 8. HOST STARTS GAME
// ============================================================

{
  const result = startGame({
    roomId,
    userId: host.userId,
  });

  assert.equal(result.success, true);
  assert.equal(
    result.room.status,
    "playing"
  );

  console.log("✓ host started game");
}


// ============================================================
// 9. ROOM CONNECTED TO GAME ENGINE
// ============================================================

{
  const room = getRoom({
    roomId,
  });

  assert.ok(room.game);

  console.log(
    "✓ room connected to game engine"
  );
}


// ============================================================
// 10. JOINING STARTED GAME REJECTED
// ============================================================

{
  const result = joinRoom({
    roomId,
    userId: "user-99",
    name: "Late Player",
    color: "blue",
  });

  assert.equal(result.success, false);

  console.log(
    "✓ joining started game rejected"
  );
}


// ============================================================
// 11. PLAYER LEAVE ROOM
// ============================================================

{
  clearRooms();

  const created = createRoom({
    hostId: host.userId,
    hostName: host.name,
    hostColor: host.color,
    maxPlayers: 2,
  });

  const testRoomId =
    created.room.roomId;

  joinRoom({
    roomId: testRoomId,
    userId: player2.userId,
    name: player2.name,
    color: player2.color,
  });

  const leaveResult = leaveRoom({
    roomId: testRoomId,
    userId: player2.userId,
  });

  assert.equal(
    leaveResult.room.players.length,
    1
  );

  console.log(
    "✓ player can leave room"
  );
}


// ============================================================
// 12. HOST TRANSFER
// ============================================================

{
  clearRooms();

  const created = createRoom({
    hostId: host.userId,
    hostName: host.name,
    hostColor: host.color,
    maxPlayers: 2,
  });

  const testRoomId =
    created.room.roomId;

  joinRoom({
    roomId: testRoomId,
    userId: player2.userId,
    name: player2.name,
    color: player2.color,
  });

  const leaveResult = leaveRoom({
    roomId: testRoomId,
    userId: host.userId,
  });

  assert.equal(
    leaveResult.room.hostId,
    player2.userId
  );

  console.log(
    "✓ new host assigned when original host leaves"
  );
}


// ============================================================
// 13. GET ALL ROOMS
// ============================================================

{
  const rooms = getRooms();

  assert.ok(
    Array.isArray(rooms)
  );

  console.log(
    "✓ all rooms retrieved"
  );
}

// ============================================================
// 7-PLAYER ROOM
// ============================================================

{
  const created = createRoom({
    hostId: "user-1",
    hostName: "Player 1",
    maxPlayers: 7,
  });

  assert.equal(created.success, true);

  let room = created.room;

  const joinPlayers = [
    ["user-2", "Player 2"],
    ["user-3", "Player 3"],
    ["user-4", "Player 4"],
    ["user-5", "Player 5"],
    ["user-6", "Player 6"],
    ["user-7", "Player 7"],
  ];

  for (const [userId, name] of joinPlayers) {
    const result = joinRoom({
      roomId: room.roomId,
      userId,
      name,
    });

    assert.equal(result.success, true);
    room = result.room;
  }

  assert.equal(room.players.length, 7);
  assert.equal(room.maxPlayers, 7);

  assert.deepEqual(
    room.players.map((player) => player.color),
    [
      "red",
      "green",
      "orange",
      "blue",
      "yellow",
      "purple",
      "pink",
    ]
  );

  const startCheck = canStartGame({
    roomId: room.roomId,
  });

  assert.equal(startCheck.canStart, true);

  console.log("✓ 7-player room");
}

// ============================================================
// 8-PLAYER ROOM
// ============================================================

{
  const created = createRoom({
    hostId: "user-1",
    hostName: "Player 1",
    maxPlayers: 8,
  });

  assert.equal(created.success, true);

  let room = created.room;

  const joinPlayers = [
    ["user-2", "Player 2"],
    ["user-3", "Player 3"],
    ["user-4", "Player 4"],
    ["user-5", "Player 5"],
    ["user-6", "Player 6"],
    ["user-7", "Player 7"],
    ["user-8", "Player 8"],
  ];

  for (const [userId, name] of joinPlayers) {
    const result = joinRoom({
      roomId: room.roomId,
      userId,
      name,
    });

    assert.equal(result.success, true);
    room = result.room;
  }

  assert.equal(room.players.length, 8);
  assert.equal(room.maxPlayers, 8);

  assert.deepEqual(
    room.players.map((player) => player.color),
    [
      "red",
      "green",
      "orange",
      "blue",
      "yellow",
      "purple",
      "pink",
      "white",
    ]
  );

  const startCheck = canStartGame({
    roomId: room.roomId,
  });

  assert.equal(startCheck.canStart, true);

  console.log("✓ 8-player room");
}

// ============================================================
// 7 & 8 PLAYER GAME START
// ============================================================

{
  const createAndFillRoom = ({
    maxPlayers,
  }) => {
    const created = createRoom({
      hostId: "host",
      hostName: "Host",
      maxPlayers,
    });

    assert.equal(created.success, true);

    let room = created.room;

    for (let i = 2; i <= maxPlayers; i++) {
      const joined = joinRoom({
        roomId: room.roomId,
        userId: `user-${i}`,
        name: `Player ${i}`,
      });

      assert.equal(joined.success, true);
      room = joined.room;
    }

    return room;
  };

  // 7 players
  const room7 = createAndFillRoom({
    maxPlayers: 7,
  });

  const started7 = startGame({
    roomId: room7.roomId,
    userId: "host",
  });

  assert.equal(started7.success, true);
  assert.equal(started7.room.status, "playing");
  assert.equal(started7.room.game.playerCount, 7);
  assert.equal(started7.room.game.players.length, 7);

  console.log("✓ 7-player game started");

  // 8 players
  const room8 = createAndFillRoom({
    maxPlayers: 8,
  });

  const started8 = startGame({
    roomId: room8.roomId,
    userId: "host",
  });

  assert.equal(started8.success, true);
  assert.equal(started8.room.status, "playing");
  assert.equal(started8.room.game.playerCount, 8);
  assert.equal(started8.room.game.players.length, 8);

  console.log("✓ 8-player game started");
}


console.log("");
console.log("=================================");
console.log(
  "All room manager tests passed!"
);
console.log("=================================");