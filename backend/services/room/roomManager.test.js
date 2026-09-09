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
} from "./roomManager.js";

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


console.log("");
console.log("=================================");
console.log(
  "All room manager tests passed!"
);
console.log("=================================");