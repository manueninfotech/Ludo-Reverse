import {
  createRoom,
  joinRoom,
  leaveRoom,
  startGame,
  getRoom,
} from "../services/room/roomManager.js";

import {
  rollGameDice,
  getLegalMoves,
  moveCoin,
  checkGameFinished,
  prepareGameExtraTurn,
  completeGameTurn,
} from "../services/game/gameEngine.js";

import {
  startTurnTimer,
  clearTurnTimer,
  restartMovementTimer,
} from "../services/game/turnTimer.js";

// ----------------------------------------------------------
// Register Room Socket Events
// ----------------------------------------------------------

export const registerRoomSocket = (io, socket) => {

  // --------------------------------------------------------
  // CREATE ROOM
  // --------------------------------------------------------

  socket.on("create_room", (data, callback) => {

    const result = createRoom(data);

    if (!result.success) {
      return callback?.({
        success: false,
        reason: result.reason,
      });
    }

    const room = result.room;

    // Join Socket.IO room
    socket.join(room.roomId);

    // Store player information on socket
    socket.data.roomId = room.roomId;
    socket.data.userId = data.hostId;

    callback?.({
      success: true,
      room,
    });

    // Notify players in room
    io.to(room.roomId).emit(
      "room_updated",
      room
    );
  });


  // --------------------------------------------------------
  // JOIN ROOM
  // --------------------------------------------------------

  socket.on("join_room", (data, callback) => {

    const result = joinRoom(data);

    if (!result.success) {
      return callback?.({
        success: false,
        reason: result.reason,
      });
    }

    const room = result.room;

    // Join Socket.IO room
    socket.join(room.roomId);

    // Store player information on socket
    socket.data.roomId = room.roomId;
    socket.data.userId = data.userId;

    callback?.({
      success: true,
      room,
    });

    // Notify all players
    io.in(room.roomId).emit("room_updated", {
  ...room,
  players: [...room.players],
});
  });


// --------------------------------------------------------
// RESUME ROOM
// --------------------------------------------------------

socket.on("resume_room", (data, callback) => {
  const { roomId, userId } = data;

  if (!roomId || !userId) {
    return callback?.({
      success: false,
      reason: "Room ID and user ID are required.",
    });
  }

  const room = getRoom({
    roomId: roomId.trim().toUpperCase(),
  });

  if (!room) {
    return callback?.({
      success: false,
      reason: "Room not found.",
    });
  }

  // Find the existing player in the room.
  const roomPlayer = room.players.find(
    (player) => player.userId === userId
  );

  if (!roomPlayer) {
    return callback?.({
      success: false,
      reason: "Player is not a member of this room.",
    });
  }

  // Mark room player as connected again.
  room.players = room.players.map((player) => {
    if (player.userId !== userId) {
      return player;
    }

    return {
      ...player,
      isConnected: true,
    };
  });

  // Mark game player as connected again.
  if (room.game) {
    room.game = {
      ...room.game,

      players: room.game.players.map((player) => {
        if (player.userId !== userId) {
          return player;
        }

        return {
          ...player,
          isConnected: true,
        };
      }),
    };
  }

  // Rejoin the Socket.IO room.
  socket.join(room.roomId);

  // Restore socket identity.
  socket.data.roomId = room.roomId;
  socket.data.userId = userId;

  callback?.({
    success: true,
    room,
    game: room.game,
  });

  // Send the latest room/game state to everyone.
  io.to(room.roomId).emit("room_updated", {
    ...room,
    players: [...room.players],
  });

  // If a game is running, send the current timer state
  // without restarting/resetting the timer.
  if (
    room.game &&
    room.game.currentTurn &&
    room.game.currentTurn.turnExpiresAt
  ) {
    const remainingMs =
      new Date(
        room.game.currentTurn.turnExpiresAt
      ).getTime() - Date.now();

    const remainingSeconds = Math.max(
      0,
      Math.ceil(remainingMs / 1000)
    );

    socket.emit("turn_timer", {
      roomId: room.roomId,
      playerId: room.game.currentTurn.playerId,
      remainingSeconds,
      expiresAt:
        room.game.currentTurn.turnExpiresAt,
    });
  }
});


  // --------------------------------------------------------
  // START GAME
  // --------------------------------------------------------

  socket.on("start_game", (data, callback) => {

    const result = startGame({
      roomId: data.roomId,
      userId: data.userId,
    });

    if (!result.success) {
      return callback?.({
        success: false,
        reason: result.reason,
      });
    }

    const room = result.room;

    callback?.({
      success: true,
      room,
    });

    io.to(room.roomId).emit("game_started", room);

    // Notify all players
    startTurnTimer({
  io,
  room,
});
  });

    // --------------------------------------------------------
// ROLL DICE
// --------------------------------------------------------

socket.on("roll_dice", (data, callback) => {

  const { roomId, diceValue } = data;
  const userId = socket.data.userId;

  // Get room
  const room = getRoom({ roomId });

  if (!room) {
    return callback?.({
      success: false,
      reason: "Room not found.",
    });
  }

  // Game must be running
  if (!room.game) {
    return callback?.({
      success: false,
      reason: "Game has not started.",
    });
  }

  // Roll dice through game engine
  const result = rollGameDice({
  game: room.game,
  playerId: userId,
  diceValue,
});

  if (!result.success) {
    return callback?.({
      success: false,
      reason: result.reason,
    });
  }

  // Update room game state
  room.game = result.game;

  const finishResult = checkGameFinished({
  game: room.game,
});

if (finishResult.finished) {
  room.game = finishResult.game;

  clearTurnTimer({
    roomId,
  });

  io.to(roomId).emit("game_finished", {
    game: room.game,
    winner: finishResult.winner,
  });

  callback?.({
    success: true,
    game: room.game,
    capture: result.capture,
    finished: true,
    winnerId: finishResult.winner.userId,
  });

  return;
}

  // Get legal moves after dice roll
  let legalMoves = getLegalMoves({
    game: room.game,
  });

  // ------------------------------------------------------
  // NO LEGAL MOVE
  // ------------------------------------------------------

  if (legalMoves.length === 0) {

    // Automatically pass turn to next player
    const nextTurnResult = completeGameTurn({
      game: room.game,
    });

    if (!nextTurnResult.success) {
      return callback?.({
        success: false,
        reason: nextTurnResult.reason,
      });
    }

    room.game = nextTurnResult.game;
    startTurnTimer({
      io,
      room,
    });

    // Send response to player who rolled
    callback?.({
      success: true,
      diceValue: result.diceValue,
      legalMoves: [],
      game: room.game,
      turnPassed: true,
      reason: "No legal moves. Turn passed to next player.",
    });

    // Notify everyone in the room
    io.to(roomId).emit("dice_rolled", {
      playerId: userId,
      diceValue: result.diceValue,
      legalMoves: [],
      game: room.game,
      turnPassed: true,
      reason: "No legal moves. Turn passed to next player.",
    });



    return;
  }

  // ------------------------------------------------------
  // NORMAL RESULT
  // ------------------------------------------------------

  callback?.({
    success: true,
    diceValue: result.diceValue,
    legalMoves,
    game: room.game,
    turnPassed: false,
  });

  // Notify everyone in the room
  io.to(roomId).emit("dice_rolled", {
    playerId: userId,
    diceValue: result.diceValue,
    legalMoves,
    game: room.game,
    turnPassed: false,
  });

  if (legalMoves.length > 0) {
  restartMovementTimer({
    io,
    room,
  });
}
});

// --------------------------------------------------------
// MOVE COIN
// --------------------------------------------------------

socket.on("move_coin", (data, callback) => {

  const {
  roomId,
  coinId,
  direction,
} = data;

const userId = socket.data.userId;

  // Get room
  const room = getRoom({ roomId });

  if (!room) {
    return callback?.({
      success: false,
      reason: "Room not found.",
    });
  }

  // Game must be running
  if (!room.game) {
    return callback?.({
      success: false,
      reason: "Game has not started.",
    });
  }

  // Move coin through game engine
  const result = moveCoin({
    game: room.game,
    playerId: userId,
    coinId,
    direction,
  });

  if (!result.success) {
    return callback?.({
      success: false,
      reason: result.reason,
    });
  }

  // Update room game state
  room.game = result.game;

  // The current timer is no longer needed
  clearTurnTimer({
    roomId,
  });

  // ------------------------------------------------------
  // SEND RESPONSE TO PLAYER
  // ------------------------------------------------------

  callback?.({
    success: true,
    game: room.game,
    capture: result.capture,
  });

  // ------------------------------------------------------
  // NOTIFY EVERYONE
  // ------------------------------------------------------

  io.to(roomId).emit("coin_moved", {
    playerId: userId,
    coinId,
    direction,
    game: room.game,
    capture: result.capture,
  });

  // ------------------------------------------------------
  // GAME FINISHED
  // ------------------------------------------------------

  if (room.game.status === "finished") {

    io.to(roomId).emit("game_finished", {
      game: room.game,
    });

    return;
  }

  // ------------------------------------------------------
  // EXTRA TURN
  // ------------------------------------------------------

  if (room.game.currentTurn.extraTurn === true) {
  const extraTurnResult = prepareGameExtraTurn({
    game: room.game,
  });

  if (!extraTurnResult.success) {
    return callback?.({
      success: false,
      reason: extraTurnResult.reason,
    });
  }

  room.game = extraTurnResult.game;

  io.to(roomId).emit("turn_changed", {
    game: room.game,
  });

  startTurnTimer({
    io,
    room,
  });

  return;
}

  // ------------------------------------------------------
  // NORMAL TURN
  // ------------------------------------------------------

  // Move to the next player
  const nextTurnResult = completeGameTurn({
    game: room.game,
  });

  if (!nextTurnResult.success) {
    return callback?.({
      success: false,
      reason: nextTurnResult.reason,
    });
  }

  room.game = nextTurnResult.game;

  io.to(roomId).emit("turn_changed", {
    game: room.game,
  });

  // Start the next player's 30-second timer
  startTurnTimer({
    io,
    room,
  });
});


  // --------------------------------------------------------
  // LEAVE ROOM
  // --------------------------------------------------------

  socket.on("leave_room", (data, callback) => {

    const result = leaveRoom({
      roomId: data.roomId,
      userId: data.userId,
    });

    if (!result.success) {
      return callback?.({
        success: false,
        reason: result.reason,
      });
    }

    socket.leave(data.roomId);

    socket.data.roomId = null;
    socket.data.userId = null;

    callback?.({
      success: true,
      room: result.room,
    });

    // Notify remaining players
    if (result.room) {
      io.to(data.roomId).emit(
        "room_updated",
        result.room
      );
    }
  });

    // --------------------------------------------------------
  // SOCKET DISCONNECT
  // --------------------------------------------------------

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    const userId = socket.data.userId;

    console.log(
      `Player disconnected: ${socket.id}`
    );

    if (!roomId || !userId) {
      return;
    }

    const room = getRoom({ roomId });

    if (!room) {
      return;
    }

    // Mark this player as disconnected.
    if (room.game) {
      room.game = {
        ...room.game,

        players: room.game.players.map((player) => {
          if (player.userId !== userId) {
            return player;
          }

          return {
            ...player,
            isConnected: false,
          };
        }),
      };
    }

    // Also update the room player's connection state.
    room.players = room.players.map((player) => {
      if (player.userId !== userId) {
        return player;
      }

      return {
        ...player,
        isConnected: false,
      };
    });

    // Notify remaining players.
    io.to(roomId).emit("room_updated", {
      ...room,
      players: [...room.players],
    });

    // Notify remaining players specifically about the disconnect.
    io.to(roomId).emit("player_disconnected", {
      userId,
      roomId,
    });

    const connectedPlayers =
  room.game?.players?.filter(
    (player) =>
      player.isConnected !== false
  ) || [];

if (
  room.game &&
  room.game.status === "playing" &&
  connectedPlayers.length === 1
) {
  const winner = connectedPlayers[0];

  clearTurnTimer({
    roomId,
  });

  room.game = {
    ...room.game,
    status: "finished",
    winnerId: winner.userId,
    currentTurn: {
      ...room.game.currentTurn,
      turnExpiresAt: null,
    },
  };

  io.to(roomId).emit("game_finished", {
    game: room.game,
    winner,
    reason: "opponent_disconnected",
  });

  return;
}
if (
  room.game &&
  room.game.status === "playing" &&
  room.game.currentTurn?.playerId === userId
) {
  clearTurnTimer({ roomId });

  const result = completeGameTurn({
    game: room.game,
  });

  if (result.success) {
    room.game = result.game;

    io.to(roomId).emit("turn_changed", {
      game: room.game,
    });

    startTurnTimer({
      io,
      roomId,
      game: room.game,
    });
  }
}
  });

  
};