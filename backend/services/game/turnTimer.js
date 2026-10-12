import {
  rollGameDice,
  getLegalMoves,
  completeGameTurn,
} from "./gameEngine.js";

import {
  recordCompletedGame,
} from "../stats/userStatsService.js";

import { scheduleBotTurn as runBotTurn } from "./botTurnScheduler.js";
import { performAutomaticMove, shouldAutoMove } from "./turnAutoMove.js";

// Re-export submodules so no existing consumers break
export {
  clearLocalTurnTimer,
  startLocalTurnTimer,
  handleLocalTurnTimeout,
} from "./localTurnTimer.js";

export { scheduleBotTurn } from "./botTurnScheduler.js";
export { performAutomaticMove, shouldAutoMove } from "./turnAutoMove.js";

const TURN_TIME_MS = 30 * 1000;
const MAX_MISSED_TURNS = 5;

const activeTimers = new Map();

const getRandomDiceValue = () => {
  return Math.floor(Math.random() * 6) + 1;
};

/**
 * Clear the timer for a room.
 */
export const clearTurnTimer = ({ roomId }) => {
  const timer = activeTimers.get(roomId);

  if (!timer) {
    return;
  }

  clearTimeout(timer.timeout);
  clearInterval(timer.interval);

  activeTimers.delete(roomId);
};

/**
 * Emit the current timer state.
 */
const emitTimer = ({
  io,
  room,
  remainingSeconds,
}) => {
  if (!room?.game) {
    return;
  }

  io.to(room.roomId).emit("turn_timer", {
    roomId: room.roomId,
    playerId: room.game.currentTurn.playerId,
    remainingSeconds,
    expiresAt: room.game.currentTurn.turnExpiresAt,
  });
};

/**
 * Start a 30-second timer for the current turn.
 */
export const startTurnTimer = ({
  io,
  room,
}) => {
  if (!room?.game) {
    return;
  }

  clearTurnTimer({
    roomId: room.roomId,
  });

  if (!room.game.currentTurn) {
    console.error(
      `[TURN TIMER] Cannot start timer: currentTurn is missing for room ${room.roomId}`,
      room.game
    );
    return;
  }

  const playerId = room.game.currentTurn.playerId;
  const currentPlayer = room.game.players.find((p) => p.userId === playerId);

  // If the active player is a server-side bot, execute automated turn
  if (currentPlayer?.isBot) {
    runBotTurn({
      io,
      room,
      botPlayer: currentPlayer,
      clearTurnTimer,
      startTurnTimer,
      activeTimers,
    });
    return;
  }

  const turnDurationMs = TURN_TIME_MS;
  const expiresAt = Date.now() + turnDurationMs;

  room.game = {
    ...room.game,
    currentTurn: {
      ...room.game.currentTurn,
      turnExpiresAt: new Date(expiresAt),
    },
  };

  let remainingSeconds = 30;

  emitTimer({
    io,
    room,
    remainingSeconds,
  });

  const interval = setInterval(() => {
    const currentTimer = activeTimers.get(room.roomId);

    if (!currentTimer || currentTimer.interval !== interval) {
      clearInterval(interval);
      return;
    }

    const remainingMs = expiresAt - Date.now();

    remainingSeconds = Math.max(
      0,
      Math.ceil(remainingMs / 1000)
    );

    emitTimer({
      io,
      room,
      remainingSeconds,
    });

    if (remainingMs <= 0) {
      clearInterval(interval);
    }
  }, 1000);

  const timeout = setTimeout(async () => {
    clearInterval(interval);

    const currentTimer = activeTimers.get(room.roomId);

    if (!currentTimer || currentTimer.timeout !== timeout) {
      return;
    }

    activeTimers.delete(room.roomId);

    await handleTurnTimeout({
      io,
      room,
      playerId,
      expiresAt,
    });
  }, turnDurationMs);

  activeTimers.set(room.roomId, {
    timeout,
    interval,
    playerId,
    expiresAt,
  });
};

const registerMissedTurn = ({
  room,
  playerId,
}) => {
  if (!room?.game) {
    return {
      missedTurns: 0,
      disconnected: false,
    };
  }

  let missedTurns = 0;

  room.game = {
    ...room.game,

    players: room.game.players.map((player) => {
      if (player.userId !== playerId) {
        return player;
      }

      missedTurns = (player.missedTurns ?? 0) + 1;

      return {
        ...player,
        missedTurns,
      };
    }),
  };

  return {
    missedTurns,
    disconnected: missedTurns >= MAX_MISSED_TURNS,
  };
};

const disconnectTimedOutPlayer = async ({
  io,
  room,
  playerId,
}) => {
  clearTurnTimer({
    roomId: room.roomId,
  });

  room.game = {
    ...room.game,

    players: room.game.players.map((player) => {
      if (player.userId !== playerId) {
        return player;
      }

      return {
        ...player,
        isConnected: false,
        isEliminated: true,
      };
    }),
  };

  const remainingActivePlayers = room.game.players.filter(
    (player) => !player.isEliminated
  );

  // 2-player game: remaining player wins immediately.
  if (remainingActivePlayers.length === 1) {
    const winner = remainingActivePlayers[0];

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
        "Failed to record timeout-disconnect game statistics:",
        error
      );
    }

    io.to(room.roomId).emit("game_finished", {
      game: room.game,
      winner,
      reason: "player_auto_disconnected",
    });

    return;
  }

  // 3+ player game: skip the disconnected player.
  const result = completeGameTurn({
    game: room.game,
  });

  if (!result.success) {
    console.error(
      "Failed to skip automatically disconnected player:",
      result.reason
    );
    return;
  }

  room.game = result.game;

  const killedCoins = result.capture?.killedCoins || [];
  const killsThisMove = killedCoins.length;

  if (!room.game.statsTracking) {
    room.game.statsTracking = {
      finalized: false,
      players: {},
    };
  }

  room.game.players.forEach((player) => {
    if (!room.game.statsTracking.players[player.userId]) {
      room.game.statsTracking.players[player.userId] = {
        kills: 0,
        tokensCaptured: 0,
      };
    }
  });

  if (killsThisMove > 0) {
    room.game.statsTracking.players[playerId].kills += killsThisMove;

    killedCoins.forEach((killedCoin) => {
      const killedPlayerId = killedCoin.playerId;

      if (
        killedPlayerId &&
        room.game.statsTracking.players[killedPlayerId]
      ) {
        room.game.statsTracking.players[killedPlayerId].tokensCaptured += 1;
      }
    });
  }

  io.to(room.roomId).emit("player_disconnected", {
    playerId,
    reason: "miss_limit_reached",
    game: room.game,
  });

  io.to(room.roomId).emit("turn_changed", {
    game: room.game,
    auto: true,
  });

  if (room.game.status === "playing") {
    startTurnTimer({
      io,
      room,
    });
  }
};

/**
 * Handle a 30-second timeout.
 */
export const handleTurnTimeout = async ({
  io,
  room,
  playerId,
  expiresAt,
}) => {
  if (!room?.game) {
    return;
  }

  const currentTurn = room.game.currentTurn;

  // Ignore stale timers.
  if (
    currentTurn.playerId !== playerId ||
    !currentTurn.turnExpiresAt ||
    new Date(currentTurn.turnExpiresAt).getTime() !==
      new Date(expiresAt).getTime()
  ) {
    return;
  }

  const missResult = registerMissedTurn({
    room,
    playerId,
  });

  console.log(
    `[TURN TIMER] ${room.roomId} - ${playerId} missed turn ${missResult.missedTurns}/${MAX_MISSED_TURNS}`
  );

  if (missResult.disconnected) {
    console.log(
      `[TURN TIMER] ${room.roomId} - ${playerId} reached ${MAX_MISSED_TURNS} missed turns and was automatically disconnected`
    );

    await disconnectTimedOutPlayer({
      io,
      room,
      playerId,
    });

    return;
  }

  /**
   * CASE 1:
   * Player has not rolled yet.
   * Automatically roll the dice.
   */
  if (!currentTurn.hasRolled) {
    const diceValue = getRandomDiceValue();
    console.log(
      `[TURN TIMER] ${room.roomId} - ${playerId} timed out. Auto rolling ${diceValue}`
    );

    const gameForAutoRoll = {
      ...room.game,
      currentTurn: {
        ...room.game.currentTurn,
        turnExpiresAt: null,
      },
    };

    const rollResult = rollGameDice({
      game: gameForAutoRoll,
      diceValue,
    });

    if (!rollResult.success) {
      console.error(
        "Automatic dice roll failed:",
        rollResult.reason
      );
      return;
    }

    room.game = rollResult.game;

    const legalMoves = getLegalMoves({
      game: room.game,
    });

    io.to(room.roomId).emit("dice_rolled", {
      game: room.game,
      diceValue,
      legalMoves,
      auto: true,
    });

    /**
     * No legal move:
     * immediately pass the turn.
     */
    if (legalMoves.length === 0) {
      const nextTurnResult = completeGameTurn({
        game: room.game,
      });

      if (!nextTurnResult.success) {
        console.error(
          "Automatic turn change failed:",
          nextTurnResult.reason
        );
        return;
      }

      room.game = nextTurnResult.game;

      setTimeout(() => {
        if (room?.game) {
          io.to(room.roomId).emit("turn_changed", {
            game: room.game,
            auto: true,
          });
        }
      }, 700);

      if (room.game.status === "playing") {
        startTurnTimer({
          io,
          room,
        });
      }

      return;
    }

    /**
     * A legal move exists:
     * Immediately auto-move a legal coin.
     */
    await performAutomaticMove({
      io,
      room,
      legalMoves,
      clearTurnTimer,
      startTurnTimer,
    });

    return;
  }

  /**
   * CASE 2:
   * Dice was already rolled and the player
   * failed to select/move a coin.
   */
  const legalMoves = getLegalMoves({
    game: room.game,
  });

  if (legalMoves.length === 0) {
    const nextTurnResult = completeGameTurn({
      game: room.game,
    });

    if (!nextTurnResult.success) {
      console.error(
        "Automatic turn change failed:",
        nextTurnResult.reason
      );
      return;
    }

    room.game = nextTurnResult.game;

    io.to(room.roomId).emit("turn_changed", {
      game: room.game,
      auto: true,
    });

    if (room.game.status === "playing") {
      startTurnTimer({
        io,
        room,
      });
    }

    return;
  }

  await performAutomaticMove({
    io,
    room,
    legalMoves,
    clearTurnTimer,
    startTurnTimer,
  });
};

/**
 * Restart the timer after a manual dice roll
 * when the player still needs to move.
 */
export const restartMovementTimer = ({
  io,
  room,
}) => {
  startTurnTimer({
    io,
    room,
  });
};