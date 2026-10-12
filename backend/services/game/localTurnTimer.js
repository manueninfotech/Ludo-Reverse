import {
  rollGameDice,
  getLegalMoves,
  moveCoin,
  checkGameFinished,
  prepareGameExtraTurn,
  completeGameTurn,
} from "./gameEngine.js";

import {
  getLocalGame,
  updateLocalGame,
} from "../local/localGameManager.js";

const TURN_TIME_MS = 30 * 1000;
const MAX_MISSED_TURNS = 5;

const activeLocalTimers = new Map();

const getRandomDiceValue = () => {
  return Math.floor(Math.random() * 6) + 1;
};

export const clearLocalTurnTimer = ({ gameId }) => {
  const timer = activeLocalTimers.get(gameId);

  if (!timer) {
    return;
  }

  clearTimeout(timer.timeout);
  clearInterval(timer.interval);

  activeLocalTimers.delete(gameId);
};

export const registerLocalMissedTurn = ({
  game,
  playerId,
}) => {
  if (!game) {
    return {
      missedTurns: 0,
      disconnected: false,
    };
  }

  let missedTurns = 0;

  const updatedGame = {
    ...game,

    players: game.players.map((player) => {
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
    game: updatedGame,
    missedTurns,
    disconnected: missedTurns >= MAX_MISSED_TURNS,
  };
};

export const disconnectLocalTimedOutPlayer = ({
  io,
  gameId,
  game,
  playerId,
}) => {
  clearLocalTurnTimer({
    gameId,
  });

  const updatedGame = {
    ...game,

    players: game.players.map((player) => {
      if (player.userId !== playerId) {
        return player;
      }

      return {
        ...player,
        isConnected: false,
      };
    }),
  };

  const connectedPlayers = updatedGame.players.filter(
    (player) => player.isConnected !== false
  );

  // ----------------------------------------------------------
  // 2 PLAYERS → REMAINING PLAYER WINS
  // ----------------------------------------------------------
  if (connectedPlayers.length === 1) {
    const winner = connectedPlayers[0];

    const finishedGame = {
      ...updatedGame,

      status: "finished",

      winnerId: winner.userId,

      currentTurn: {
        ...updatedGame.currentTurn,
        turnExpiresAt: null,
      },
    };

    updateLocalGame({
      gameId,
      game: finishedGame,
    });

    io.to(gameId).emit("local_game_finished", {
      game: finishedGame,
      winner,
      reason: "player_auto_disconnected",
    });

    return;
  }

  // ----------------------------------------------------------
  // 3+ PLAYERS → CONTINUE GAME
  // ----------------------------------------------------------
  updateLocalGame({
    gameId,
    game: updatedGame,
  });

  io.to(gameId).emit("local_player_disconnected", {
    playerId,
    reason: "miss_limit_reached",
    game: updatedGame,
  });

  // Move to the next connected player
  const nextTurnResult = completeGameTurn({
    game: updatedGame,
  });

  if (!nextTurnResult.success) {
    console.error(
      "[LOCAL TIMER] Failed to skip disconnected player:",
      nextTurnResult.reason
    );
    return;
  }

  const nextGame = nextTurnResult.game;

  updateLocalGame({
    gameId,
    game: nextGame,
  });

  io.to(gameId).emit("local_turn_changed", {
    gameId,
    game: nextGame,
    auto: true,
  });

  if (nextGame.status === "playing") {
    startLocalTurnTimer({
      io,
      gameId,
    });
  }
};

export const startLocalTurnTimer = ({ io, gameId }) => {
  clearLocalTurnTimer({ gameId });

  const localGame = getLocalGame({ gameId });

  if (
    !localGame?.game ||
    localGame.game.status !== "playing"
  ) {
    return;
  }

  const playerId = localGame.game.currentTurn.playerId;

  if (!playerId) {
    return;
  }

  const expiresAt = Date.now() + TURN_TIME_MS;

  const updatedGame = {
    ...localGame.game,
    currentTurn: {
      ...localGame.game.currentTurn,
      turnExpiresAt: new Date(expiresAt),
    },
  };

  updateLocalGame({
    gameId,
    game: updatedGame,
  });

  let remainingSeconds = 30;

  io.to(gameId).emit("local_turn_timer", {
    gameId,
    playerId,
    remainingSeconds,
    expiresAt,
  });

  const interval = setInterval(() => {
    const currentTimer = activeLocalTimers.get(gameId);

    if (!currentTimer || currentTimer.interval !== interval) {
      clearInterval(interval);
      return;
    }

    const remainingMs = expiresAt - Date.now();

    remainingSeconds = Math.max(
      0,
      Math.ceil(remainingMs / 1000)
    );

    io.to(gameId).emit("local_turn_timer", {
      gameId,
      playerId,
      remainingSeconds,
      expiresAt,
    });

    if (remainingMs <= 0) {
      clearInterval(interval);
    }
  }, 1000);

  const timeout = setTimeout(() => {
    clearInterval(interval);

    const currentTimer = activeLocalTimers.get(gameId);

    if (
      !currentTimer ||
      currentTimer.timeout !== timeout
    ) {
      return;
    }

    activeLocalTimers.delete(gameId);

    handleLocalTurnTimeout({
      io,
      gameId,
      playerId,
      expiresAt,
    });
  }, TURN_TIME_MS);

  activeLocalTimers.set(gameId, {
    timeout,
    interval,
    playerId,
    expiresAt,
  });
};

export const handleLocalTurnTimeout = ({
  io,
  gameId,
  playerId,
  expiresAt,
}) => {
  const localGame = getLocalGame({ gameId });

  if (
    !localGame?.game ||
    localGame.game.status !== "playing"
  ) {
    return;
  }

  const currentTurn = localGame.game.currentTurn;

  // Ignore stale timer
  if (
    currentTurn.playerId !== playerId ||
    !currentTurn.turnExpiresAt ||
    new Date(currentTurn.turnExpiresAt).getTime() !==
      new Date(expiresAt).getTime()
  ) {
    return;
  }

  const missResult = registerLocalMissedTurn({
    game: localGame.game,
    playerId,
  });

  updateLocalGame({
    gameId,
    game: missResult.game,
  });

  if (missResult.disconnected) {
    disconnectLocalTimedOutPlayer({
      io,
      gameId,
      game: missResult.game,
      playerId,
    });
    return;
  }

  // ----------------------------------------------------------
  // AUTOMATIC DICE ROLL
  // ----------------------------------------------------------
  const diceValue = getRandomDiceValue();

  const gameForAutoRoll = {
    ...missResult.game,
    currentTurn: {
      ...missResult.game.currentTurn,
      turnExpiresAt: null,
    },
  };

  const rollResult = rollGameDice({
    game: gameForAutoRoll,
    playerId,
    diceValue,
  });

  if (!rollResult.success) {
    console.error(
      "[LOCAL TURN TIMER] Automatic dice roll failed:",
      rollResult.reason
    );
    return;
  }

  let updatedGame = rollResult.game;

  updateLocalGame({
    gameId,
    game: updatedGame,
  });

  // ----------------------------------------------------------
  // GET LEGAL MOVES
  // ----------------------------------------------------------
  const legalMoves = getLegalMoves({
    game: updatedGame,
  });

  io.to(gameId).emit("local_dice_rolled", {
    game: updatedGame,
    diceValue,
    legalMoves,
    auto: true,
  });

  // ----------------------------------------------------------
  // NO LEGAL MOVES
  // ----------------------------------------------------------
  if (legalMoves.length === 0) {
    const nextTurnResult = completeGameTurn({
      game: updatedGame,
    });

    if (!nextTurnResult.success) {
      console.error(
        "[LOCAL TURN TIMER] Automatic turn change failed:",
        nextTurnResult.reason
      );
      return;
    }

    updatedGame = nextTurnResult.game;

    updateLocalGame({
      gameId,
      game: updatedGame,
    });

    io.to(gameId).emit("local_turn_changed", {
      gameId,
      game: updatedGame,
      auto: true,
    });

    if (updatedGame.status === "playing") {
      startLocalTurnTimer({
        io,
        gameId,
      });
    }

    return;
  }

  // ----------------------------------------------------------
  // AUTOMATICALLY MOVE A LEGAL COIN
  // ----------------------------------------------------------
  const selectedMove =
    legalMoves.find(
      (move) => move.direction === "forward"
    ) || legalMoves[0];

  const gameForAutoMove = {
    ...updatedGame,
    currentTurn: {
      ...updatedGame.currentTurn,
      turnExpiresAt: null,
    },
  };

  const moveResult = moveCoin({
    game: gameForAutoMove,
    playerId,
    coinId: selectedMove.coinId,
    direction: selectedMove.direction,
  });

  if (!moveResult.success) {
    console.error(
      "[LOCAL TURN TIMER] Automatic coin move failed:",
      moveResult.reason
    );

    const nextTurnResult = completeGameTurn({
      game: updatedGame,
    });

    if (!nextTurnResult.success) {
      return;
    }

    updatedGame = nextTurnResult.game;

    updateLocalGame({
      gameId,
      game: updatedGame,
    });

    io.to(gameId).emit("local_turn_changed", {
      gameId,
      game: updatedGame,
      auto: true,
    });

    if (updatedGame.status === "playing") {
      startLocalTurnTimer({
        io,
        gameId,
      });
    }

    return;
  }

  updatedGame = moveResult.game;

  // ----------------------------------------------------------
  // CHECK GAME FINISHED / PLAYER FINISHED
  // ----------------------------------------------------------
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

  io.to(gameId).emit("local_coin_moved", {
    game: updatedGame,
    capture: moveResult.capture,
    auto: true,
  });

  // ----------------------------------------------------------
  // GAME FINISHED
  // ----------------------------------------------------------
  if (updatedGame.status === "finished") {
    clearLocalTurnTimer({
      gameId,
    });

    io.to(gameId).emit("local_game_finished", {
      game: updatedGame,
      auto: true,
    });

    return;
  }

  // ----------------------------------------------------------
  // PLAYER FINISHED - GAME CONTINUES
  // ----------------------------------------------------------
  if (playerFinished) {
    io.to(gameId).emit("local_turn_changed", {
      gameId,
      game: updatedGame,
      auto: true,
    });

    startLocalTurnTimer({
      io,
      gameId,
    });

    return;
  }

  // ----------------------------------------------------------
  // EXTRA TURN
  // ----------------------------------------------------------
  if (updatedGame.currentTurn.extraTurn === true) {
    const extraTurnResult = prepareGameExtraTurn({
      game: updatedGame,
    });

    if (!extraTurnResult.success) {
      console.error(
        "[LOCAL TURN TIMER] Automatic extra turn failed:",
        extraTurnResult.reason
      );
      return;
    }

    updatedGame = extraTurnResult.game;

    updateLocalGame({
      gameId,
      game: updatedGame,
    });

    io.to(gameId).emit("local_turn_changed", {
      gameId,
      game: updatedGame,
      auto: true,
    });

    startLocalTurnTimer({
      io,
      gameId,
    });

    return;
  }

  // ----------------------------------------------------------
  // NORMAL TURN - NEXT PLAYER
  // ----------------------------------------------------------
  const nextTurnResult = completeGameTurn({
    game: updatedGame,
  });

  if (!nextTurnResult.success) {
    console.error(
      "[LOCAL TURN TIMER] Automatic turn change failed:",
      nextTurnResult.reason
    );
    return;
  }

  updatedGame = nextTurnResult.game;

  updateLocalGame({
    gameId,
    game: updatedGame,
  });

  io.to(gameId).emit("local_turn_changed", {
    gameId,
    game: updatedGame,
    auto: true,
  });

  startLocalTurnTimer({
    io,
    gameId,
  });
};
