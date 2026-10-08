import {
  createRoom,
  joinRoom,
  leaveRoom,
  startGame,
  getRoom,
} from "../../services/room/roomManager.js";

import mongoose from "mongoose";
import { deductEntryFees } from "../../services/coins/coinService.js";

import {
  startTurnTimer,
  clearTurnTimer,
  clearLocalTurnTimer,
} from "../../services/game/turnTimer.js";

import { deleteLocalGame } from "../../services/local/localGameManager.js";

import { completeGameTurn } from "../../services/game/gameEngine.js";

import { recordCompletedGame } from "../../services/stats/userStatsService.js";

/**
 * Registers room lifecycle and connectivity socket events.
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
export const registerRoomHandler = (io, socket) => {
  // --------------------------------------------------------
  // CREATE ROOM
  // --------------------------------------------------------
  socket.on("create_room", (data, callback) => {
    const hostId = socket.data.userId || data?.hostId;
    const result = createRoom({
      ...data,
      hostId,
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
    socket.data.userId = hostId;

    callback?.({
      success: true,
      room,
    });

    // Notify players in room
    io.to(room.roomId).emit("room_updated", room);
  });

  // --------------------------------------------------------
  // JOIN ROOM
  // --------------------------------------------------------
  socket.on("join_room", (data, callback) => {
    const userId = socket.data.userId || data?.userId;
    const result = joinRoom({
      ...data,
      userId,
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
    socket.data.userId = userId;

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
    const { roomId, userId } = data || {};

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

    // Find the existing player in the room
    const roomPlayer = room.players.find(
      (player) => player.userId === userId
    );

    if (!roomPlayer) {
      return callback?.({
        success: false,
        reason: "Player is not a member of this room.",
      });
    }

    // Mark room player as connected again
    room.players = room.players.map((player) => {
      if (player.userId !== userId) {
        return player;
      }
      return {
        ...player,
        isConnected: true,
      };
    });

    // Mark game player as connected again
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

    // Rejoin the Socket.IO room
    socket.join(room.roomId);

    // Restore socket identity
    socket.data.roomId = room.roomId;
    socket.data.userId = userId;

    callback?.({
      success: true,
      room,
      game: room.game,
    });

    // Send the latest room/game state to everyone
    io.to(room.roomId).emit("room_updated", {
      ...room,
      players: [...room.players],
    });

    // If a game is running, send the current timer state without resetting
    if (
      room.game &&
      room.game.currentTurn &&
      room.game.currentTurn.turnExpiresAt
    ) {
      const remainingMs =
        new Date(room.game.currentTurn.turnExpiresAt).getTime() - Date.now();
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

      socket.emit("turn_timer", {
        roomId: room.roomId,
        playerId: room.game.currentTurn.playerId,
        remainingSeconds,
        expiresAt: room.game.currentTurn.turnExpiresAt,
      });
    }
  });

  // --------------------------------------------------------
  // START GAME
  // --------------------------------------------------------
  socket.on("start_game", async (data, callback) => {
    try {
      const room = getRoom({
        roomId: data.roomId,
      });

      if (!room) {
        return callback?.({
          success: false,
          reason: "Room not found.",
        });
      }

      const playerIds = room.players.map((player) => player.userId);

      if (playerIds.length === 0) {
        return callback?.({
          success: false,
          reason: "No players in the room.",
        });
      }

      // Deduct Entry Fee if database is connected
      if (mongoose.connection.readyState === 1) {
        try {
          await deductEntryFees(playerIds);
          console.log(
            `Entry fee deducted from ${playerIds.length} players in room ${room.roomId}`
          );
        } catch (error) {
          console.error("Failed to deduct game entry fee:", error);
          return callback?.({
            success: false,
            reason: error.message,
          });
        }
      }

      const userId = socket.data.userId || data?.userId;
      const result = startGame({
        roomId: data.roomId,
        userId,
      });

      if (!result.success) {
        return callback?.({
          success: false,
          reason: result.reason,
        });
      }

      const startedRoom = result.room;

      // Initialize temporary stats tracking
      startedRoom.game.statsTracking = {
        finalized: false,
        players: {},
      };

      startedRoom.game.players.forEach((player) => {
        startedRoom.game.statsTracking.players[player.userId] = {
          kills: 0,
          tokensCaptured: 0,
          forwardMoves: 0,
          backwardMoves: 0,
          totalMoves: 0,
        };
      });

      callback?.({
        success: true,
        room: startedRoom,
      });

      // Notify all players
      io.to(startedRoom.roomId).emit("game_started", startedRoom);

      // Start first player's timer
      startTurnTimer({
        io,
        room: startedRoom,
      });
    } catch (error) {
      console.error("Start game error:", error);
      callback?.({
        success: false,
        reason: "Failed to start the game.",
      });
    }
  });

  // --------------------------------------------------------
  // LEAVE ROOM
  // --------------------------------------------------------
  socket.on("leave_room", (data, callback) => {
    const userId = socket.data.userId || data?.userId;
    const result = leaveRoom({
      roomId: data.roomId,
      userId,
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

    if (result.room) {
      io.to(data.roomId).emit("room_updated", result.room);
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

    console.log(`Player disconnected: ${socket.id}`);

    if (!roomId || !userId) {
      return;
    }

    const room = getRoom({ roomId });
    if (!room) {
      return;
    }

    // Mark player as disconnected in game
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

    // Mark player as disconnected in room
    room.players = room.players.map((player) => {
      if (player.userId !== userId) {
        return player;
      }
      return {
        ...player,
        isConnected: false,
      };
    });

    // Notify remaining players
    io.to(roomId).emit("room_updated", {
      ...room,
      players: [...room.players],
    });

    io.to(roomId).emit("player_disconnected", {
      userId,
      roomId,
    });

    const connectedPlayers =
      room.game?.players?.filter(
        (player) => player.isConnected !== false
      ) || [];

    // If only one player is left connected in an active game, declare them winner
    if (
      room.game &&
      room.game.status === "playing" &&
      connectedPlayers.length === 1
    ) {
      const winner = connectedPlayers[0];

      clearTurnTimer({ roomId });

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

    // If the disconnecting player was the current active turn player, advance turn
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
