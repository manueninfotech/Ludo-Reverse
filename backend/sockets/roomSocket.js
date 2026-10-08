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
  startLocalTurnTimer,
  clearLocalTurnTimer,
} from "../services/game/turnTimer.js";

import {
  recordCompletedGame,
} from "../services/stats/userStatsService.js";

import {
  deductEntryFees,
} from "../services/coins/coinService.js";

import {
  createLocalGame,
  getLocalGame,
  updateLocalGame,
  deleteLocalGame,
} from "../services/local/localGameManager.js";

// ----------------------------------------------------------
// Register Room Socket Events
// ----------------------------------------------------------

export const registerRoomSocket = (io, socket) => {

  // ----------------------------------------------------------
// CREATE LOCAL GAME
// ----------------------------------------------------------

socket.on(
  "create_local_game",
  (data, callback) => {
    const result =
      createLocalGame({
        players: data?.players,
      });

    if (!result.success) {
      return callback?.({
        success: false,
        reason: result.reason,
      });
    }

    const {
      localGame,
    } = result;

    startLocalTurnTimer({
      io,
      gameId: localGame.gameId,
    });
    socket.join(
      localGame.gameId
    );

    socket.data.localGameId =
      localGame.gameId;

    callback?.({
      success: true,
      localGame,
    });

    io.to(localGame.gameId).emit(
      "local_game_created",
      localGame
    );
  }
);


// ----------------------------------------------------------
// LOCAL GAME - ROLL DICE
// ----------------------------------------------------------

socket.on(
  "local_roll_dice",
  (data, callback) => {
    const {
      gameId,
      playerId,
    } = data || {};

    const localGame = getLocalGame({
      gameId,
    });

    if (!localGame) {
      return callback?.({
        success: false,
        reason: "Local game not found.",
      });
    }

    const game = localGame.game;

    if (game.status !== "playing") {
      return callback?.({
        success: false,
        reason: "Game is not playing.",
      });
    }

    if (
      game.currentTurn.playerId !== playerId
    ) {
      return callback?.({
        success: false,
        reason: "It is not this player's turn.",
      });
    }

    const diceValue =
      Math.floor(Math.random() * 6) + 1;

    const rollResult = rollGameDice({
      game,
      playerId,
      diceValue,
    });

    if (!rollResult.success) {
      return callback?.({
        success: false,
        reason: rollResult.reason,
      });
    }

    let updatedGame = rollResult.game;

    updateLocalGame({
      gameId,
      game: updatedGame,
    });

    const legalMoves = getLegalMoves({
      game: updatedGame,
    });

    // ------------------------------------------------------
    // NO LEGAL MOVE
    // ------------------------------------------------------

    if (legalMoves.length === 0) {
      const nextTurnResult = completeGameTurn({
        game: updatedGame,
      });

      if (!nextTurnResult.success) {
        return callback?.({
          success: false,
          reason: nextTurnResult.reason,
        });
      }

      updatedGame = nextTurnResult.game;

      updateLocalGame({
        gameId,
        game: updatedGame,
      });

      callback?.({
        success: true,
        game: updatedGame,
        diceValue,
        legalMoves: [],
        turnPassed: true,
        reason:
          "No legal moves. Turn passed to next player.",
      });

      io.to(gameId).emit(
        "local_dice_rolled",
        {
          game: updatedGame,
          diceValue,
          legalMoves: [],
          turnPassed: true,
          reason:
            "No legal moves. Turn passed to next player.",
        }
      );

      io.to(gameId).emit(
        "local_turn_changed",
        {
          game: updatedGame,
          auto: true,
        }
      );

      // Start exactly ONE fresh 30-second timer
      if (updatedGame.status === "playing") {
        startLocalTurnTimer({
          io,
          gameId,
        });
      }

      return;
    }

    // ------------------------------------------------------
    // NORMAL RESULT
    // ------------------------------------------------------

    callback?.({
      success: true,
      game: updatedGame,
      diceValue,
      legalMoves,
      turnPassed: false,
    });

    io.to(gameId).emit(
      "local_dice_rolled",
      {
        game: updatedGame,
        diceValue,
        legalMoves,
        turnPassed: false,
      }
    );
  }
);

// ----------------------------------------------------------
// LOCAL GAME - MOVE COIN
// ----------------------------------------------------------

socket.on(
  "local_move_coin",
  (data, callback) => {
    const {
      gameId,
      playerId,
      coinId,
      direction,
    } = data || {};

    const localGame = getLocalGame({
      gameId,
    });

    if (!localGame) {
      return callback?.({
        success: false,
        reason: "Local game not found.",
      });
    }

    const game = localGame.game;

    if (game.status !== "playing") {
      return callback?.({
        success: false,
        reason: "Game is not playing.",
      });
    }

    if (
      game.currentTurn.playerId !== playerId
    ) {
      return callback?.({
        success: false,
        reason: "It is not this player's turn.",
      });
    }

    // ------------------------------------------------------
    // MOVE COIN
    // ------------------------------------------------------

    const moveResult = moveCoin({
      game,
      playerId,
      coinId,
      direction,
    });

    if (!moveResult.success) {
      return callback?.({
        success: false,
        reason: moveResult.reason,
      });
    }

    let updatedGame = moveResult.game;

    // Current timer is no longer valid after the move
    clearLocalTurnTimer({
      gameId,
    });

    // ------------------------------------------------------
    // CHECK GAME / PLAYER FINISH
    // ------------------------------------------------------

    const previousFinishCount =
      updatedGame.finishOrder?.length || 0;

    const finishResult = checkGameFinished({
      game: updatedGame,
    });

    updatedGame = finishResult.game;

    const newFinishCount =
      updatedGame.finishOrder?.length || 0;

    const playerFinished =
      newFinishCount > previousFinishCount;

    updateLocalGame({
      gameId,
      game: updatedGame,
    });

    // ------------------------------------------------------
    // GAME FINISHED
    // ------------------------------------------------------

    if (updatedGame.status === "finished") {
      callback?.({
        success: true,
        game: updatedGame,
        capture: moveResult.capture,
        finished: true,
      });

      io.to(gameId).emit(
        "local_coin_moved",
        {
          game: updatedGame,
          capture: moveResult.capture,
        }
      );

      io.to(gameId).emit(
        "local_game_finished",
        {
          game: updatedGame,
        }
      );

      return;
    }

    // ------------------------------------------------------
    // PLAYER FINISHED - GAME CONTINUES
    // ------------------------------------------------------

    if (playerFinished) {
      callback?.({
        success: true,
        game: updatedGame,
        capture: moveResult.capture,
      });

      io.to(gameId).emit(
        "local_coin_moved",
        {
          game: updatedGame,
          capture: moveResult.capture,
        }
      );

      io.to(gameId).emit(
        "local_turn_changed",
        {
          game: updatedGame,
        }
      );

      startLocalTurnTimer({
        io,
        gameId,
      });

      return;
    }

    // ------------------------------------------------------
    // EXTRA TURN
    // ------------------------------------------------------

    if (
      updatedGame.currentTurn.extraTurn === true
    ) {
      const extraTurnResult =
        prepareGameExtraTurn({
          game: updatedGame,
        });

      if (!extraTurnResult.success) {
        return callback?.({
          success: false,
          reason: extraTurnResult.reason,
        });
      }

      updatedGame = extraTurnResult.game;

      updateLocalGame({
        gameId,
        game: updatedGame,
      });

      callback?.({
        success: true,
        game: updatedGame,
        capture: moveResult.capture,
      });

      io.to(gameId).emit(
        "local_coin_moved",
        {
          game: updatedGame,
          capture: moveResult.capture,
        }
      );

      io.to(gameId).emit(
        "local_turn_changed",
        {
          game: updatedGame,
        }
      );

      // Fresh 30-second timer for the extra turn
      startLocalTurnTimer({
        io,
        gameId,
      });

      return;
    }

    // ------------------------------------------------------
    // NORMAL TURN - NEXT PLAYER
    // ------------------------------------------------------

    const nextTurnResult =
      completeGameTurn({
        game: updatedGame,
      });

    if (!nextTurnResult.success) {
      return callback?.({
        success: false,
        reason: nextTurnResult.reason,
      });
    }

    updatedGame = nextTurnResult.game;

    updateLocalGame({
      gameId,
      game: updatedGame,
    });

    callback?.({
      success: true,
      game: updatedGame,
      capture: moveResult.capture,
    });

    io.to(gameId).emit(
      "local_coin_moved",
      {
        game: updatedGame,
        capture: moveResult.capture,
      }
    );

    io.to(gameId).emit(
      "local_turn_changed",
      {
        game: updatedGame,
      }
    );

    // Fresh 30-second timer for next player
    if (updatedGame.status === "playing") {
      startLocalTurnTimer({
        io,
        gameId,
      });
    }
  }
);

  // --------------------------------------------------------
  // CREATE ROOM
  // --------------------------------------------------------

  socket.on("create_room", (data, callback) => {

    const result = createRoom({
  ...data,
  hostId: socket.data.userId,
});

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

    const result = joinRoom({
      ...data,
      userId: socket.data.userId,
    });

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

socket.on("start_game", async (data, callback) => {
  try {
    // --------------------------------------------------------
    // GET ROOM BEFORE STARTING THE GAME
    // --------------------------------------------------------

    const room = getRoom({
      roomId: data.roomId,
    });

    if (!room) {
      return callback?.({
        success: false,
        reason: "Room not found.",
      });
    }

    // --------------------------------------------------------
    // GET ALL PLAYERS
    // --------------------------------------------------------

    const playerIds = room.players.map(
      (player) => player.userId
    );

    if (playerIds.length === 0) {
      return callback?.({
        success: false,
        reason: "No players in the room.",
      });
    }

    // --------------------------------------------------------
    // DEDUCT ENTRY FEE
    // --------------------------------------------------------

    try {
      await deductEntryFees(playerIds);

      console.log(
        `Entry fee deducted from ${playerIds.length} players in room ${room.roomId}`
      );
    } catch (error) {
      console.error(
        "Failed to deduct game entry fee:",
        error
      );

      return callback?.({
        success: false,
        reason: error.message,
      });
    }

    // --------------------------------------------------------
    // START GAME
    // --------------------------------------------------------

    const result = startGame({
      roomId: data.roomId,
      userId: socket.data.userId,
    });

    if (!result.success) {
      return callback?.({
        success: false,
        reason: result.reason,
      });
    }

    const startedRoom = result.room;

    // --------------------------------------------------------
    // INITIALIZE TEMPORARY GAME STATISTICS
    // --------------------------------------------------------

    startedRoom.game.statsTracking = {
      finalized: false,
      players: {},
    };

    startedRoom.game.players.forEach((player) => {
      startedRoom.game.statsTracking.players[
        player.userId
      ] = {
        kills: 0,
        tokensCaptured: 0,
      };
    });

    // --------------------------------------------------------
    // SEND START GAME RESPONSE
    // --------------------------------------------------------

    callback?.({
      success: true,
      room: startedRoom,
    });

    // Notify all players
    io.to(startedRoom.roomId).emit(
      "game_started",
      startedRoom
    );

    // Start first player's timer
    startTurnTimer({
      io,
      room: startedRoom,
    });
  } catch (error) {
    console.error(
      "Start game error:",
      error
    );

    callback?.({
      success: false,
      reason: "Failed to start the game.",
    });
  }
});

    // --------------------------------------------------------
// ROLL DICE
// --------------------------------------------------------

socket.on("roll_dice", async (data, callback) => {

  const { roomId } = data || {};
  const userId = socket.data.userId;

  // Authoritative server-side dice generation (prevents client tampering)
  // In automated test environments, allow test runner to supply deterministic value
  const isTestEnv = process.env.NODE_ENV === "test";
  const diceValue =
    isTestEnv && Number.isInteger(data?.diceValue) && data.diceValue >= 1 && data.diceValue <= 6
      ? data.diceValue
      : Math.floor(Math.random() * 6) + 1;

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

socket.on("move_coin", async (data, callback) => {

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

// ------------------------------------------------------
// TRACK TEMPORARY GAME STATISTICS
// ------------------------------------------------------

const killedCoins =
  result.capture?.killedCoins || [];

const killsThisMove =
  killedCoins.length;

// Make sure stats tracking exists
if (!room.game.statsTracking) {
  room.game.statsTracking = {
    finalized: false,
    players: {},
  };
}

// Make sure every player has a stats object
room.game.players.forEach((player) => {
  if (!room.game.statsTracking.players[player.userId]) {
    room.game.statsTracking.players[player.userId] = {
      kills: 0,
      tokensCaptured: 0,
    };
  }
});

// ------------------------------------------------------
// MOVING PLAYER KILLED OPPONENT TOKENS
// ------------------------------------------------------

if (killsThisMove > 0) {
  room.game.statsTracking.players[userId].kills +=
    killsThisMove;

  // Every killed token belongs to the opponent.
  // Increase that opponent's captured-token count.
  killedCoins.forEach((killedCoin) => {
    const killedPlayerId =
      killedCoin.playerId;

    if (
      killedPlayerId &&
      room.game.statsTracking.players[killedPlayerId]
    ) {
      room.game.statsTracking.players[
        killedPlayerId
      ].tokensCaptured += 1;
    }
  });
}

// Check whether this move finished the game
// ------------------------------------------------------
// CHECK PLAYER FINISH
// ------------------------------------------------------

const previousFinishCount =
  room.game.finishOrder?.length || 0;

const finishResult =
  checkGameFinished({
    game: room.game,
  });

room.game = finishResult.game;

const newFinishCount =
  room.game.finishOrder?.length || 0;

const playerFinished =
  newFinishCount >
  previousFinishCount;

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
  const winner = room.game.players.find(
    (player) =>
      player.userId === room.game.winnerId
  );

  let completedStats = {};

  try {
    completedStats = await recordCompletedGame({
      game: room.game,
      result: "normal",
    });
  } catch (error) {
    console.error(
      "Failed to record completed game statistics:",
      error
    );
  }

  io.to(roomId).emit("game_finished", {
    game: room.game,
    winner: winner || null,
    stats: completedStats,
  });

  return;
}

// ------------------------------------------------------
// PLAYER FINISHED - GAME CONTINUES
// ------------------------------------------------------

if (playerFinished) {
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
      userId: socket.data.userId,
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

  socket.on("disconnect", async () => {
    if (socket.data.localGameId) {
  clearLocalTurnTimer({
    gameId: socket.data.localGameId,
  });

  deleteLocalGame({
    gameId: socket.data.localGameId,
  });

  socket.data.localGameId = null;
}
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

  try {
  await recordCompletedGame({
    game: room.game,
    result: "disconnected",
  });
} catch (error) {
  console.error(
    "Failed to record disconnected game statistics:",
    error
  );
}
  

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