import {
  rollGameDice,
  getLegalMoves,
  moveCoin,
  prepareGameExtraTurn,
  completeGameTurn,
} from "./gameEngine.js";

const TURN_TIME_MS = 30 * 1000;

const MAX_MISSED_TURNS = 5;

const activeTimers = new Map();

/**
 * Generate a random dice value.
 */
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
  const expiresAt = Date.now() + TURN_TIME_MS;

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

    const remainingMs =
      expiresAt - Date.now();

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

    const currentTimer =
      activeTimers.get(room.roomId);

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
  }, TURN_TIME_MS);

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

      missedTurns =
        (player.missedTurns ?? 0) + 1;

      return {
        ...player,
        missedTurns,
      };
    }),
  };

  return {
    missedTurns,
    disconnected:
      missedTurns >= MAX_MISSED_TURNS,
  };
};

const disconnectTimedOutPlayer = ({
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
      };
    }),
  };

  const connectedPlayers =
    room.game.players.filter(
      (player) => player.isConnected !== false
    );

  // 2-player game:
  // remaining player wins immediately.
  if (connectedPlayers.length === 1) {
    const winner = connectedPlayers[0];

    room.game = {
      ...room.game,
      status: "finished",
      winnerId: winner.userId,
      currentTurn: {
        ...room.game.currentTurn,
        turnExpiresAt: null,
      },
    };

    io.to(room.roomId).emit("game_finished", {
      game: room.game,
      winner,
      reason: "player_auto_disconnected",
    });

    return;
  }

  // 3+ player game:
  // skip the disconnected player.
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

  const currentTurn =
    room.game.currentTurn;

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

  disconnectTimedOutPlayer({
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

    /**
     * A legal move exists.
     *
     * If all movable coins are on the same cell,
     * automatically move one.
     *
     * Otherwise give the player another 30 seconds
     * to choose a coin.
     */
        /**
     * A legal move exists.
     *
     * Since the player already used the full 30 seconds
     * without rolling, the server has auto-rolled the dice.
     *
     * Auto-roll must immediately auto-move a legal coin.
     * No second movement timer is given.
     */
    await performAutomaticMove({
      io,
      room,
      legalMoves,
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
  });
};

/**
 * Determine whether the move can be automatic.
 *
 * Rules:
 * - 1 movable coin → automatic
 * - Multiple movable coins on same cell → automatic
 * - Movable coins on different cells → manual
 */
const shouldAutoMove = ({
  game,
  legalMoves,
}) => {
  if (legalMoves.length === 0) {
    return false;
  }

  const currentPlayer =
    game.players.find(
      (player) =>
        player.userId ===
        game.currentTurn.playerId
    );

  if (!currentPlayer) {
    return false;
  }

  const movableCoins = legalMoves
    .map((move) =>
      currentPlayer.coins.find(
        (coin) =>
          coin.coinId === move.coinId
      )
    )
    .filter(Boolean);

  if (movableCoins.length <= 1) {
    return true;
  }

  const cells = movableCoins.map((coin) => {
    if (coin.area === "base") {
      return "base";
    }

    if (coin.area === "finished") {
      return "finished";
    }

    if (
      coin.absoluteCell === null ||
      coin.absoluteCell === undefined
    ) {
      return `${coin.area}-${coin.progress}`;
    }

    return coin.absoluteCell;
  });

  return cells.every(
    (cell) => cell === cells[0]
  );
};

/**
 * Perform an automatic legal move.
 */
const performAutomaticMove = async ({
  io,
  room,
  legalMoves,
}) => {
  if (!room?.game || legalMoves.length === 0) {
    return;
  }

  const currentPlayerId =
    room.game.currentTurn.playerId;

  /**
   * Prefer forward when both directions are legal.
   */
  const selectedMove =
    legalMoves.find(
      (move) =>
        move.direction === "forward"
    ) || legalMoves[0];

  const gameForAutoMove = {
  ...room.game,
  currentTurn: {
    ...room.game.currentTurn,
    turnExpiresAt: null,
  },
};

const moveResult = moveCoin({
  game: gameForAutoMove,
  playerId: currentPlayerId,
  coinId: selectedMove.coinId,
  direction: selectedMove.direction,
});

  if (!moveResult.success) {
    return;
  }

  room.game = moveResult.game;

  io.to(room.roomId).emit("coin_moved", {
    game: room.game,
    coinId: selectedMove.coinId,
    direction: selectedMove.direction,
    capture: moveResult.capture,
    auto: true,
  });

  /**
   * If the move produced a winner/game finish,
   * don't start another timer.
   */
  if (room.game.status === "finished") {
    clearTurnTimer({
      roomId: room.roomId,
    });

    io.to(room.roomId).emit("game_finished", {
      game: room.game,
      auto: true,
    });

    return;
  }

  /**
   * Extra turn:
   * same player gets a fresh roll.
   */
  if (room.game.currentTurn.extraTurn) {
  const extraTurnResult = prepareGameExtraTurn({
    game: room.game,
  });

  if (!extraTurnResult.success) {
    console.error(
      "Automatic extra turn preparation failed:",
      extraTurnResult.reason
    );
    return;
  }

  room.game = extraTurnResult.game;

  io.to(room.roomId).emit("turn_changed", {
    game: room.game,
    auto: true,
  });

  startTurnTimer({
    io,
    room,
  });

  return;
}

  /**
   * Normal move:
   * pass to next player.
   */
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