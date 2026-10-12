import {
  rollGameDice,
  getLegalMoves,
  moveCoin,
  checkGameFinished,
  prepareGameExtraTurn,
  completeGameTurn,
} from "./gameEngine.js";

import { decideBotMove } from "./botEngine.js";

const getRandomDiceValue = () => {
  return Math.floor(Math.random() * 6) + 1;
};

/**
 * Schedule automated bot action (rolling dice and choosing tactical move).
 */
export const scheduleBotTurn = ({
  io,
  room,
  botPlayer,
  clearTurnTimer,
  startTurnTimer,
  activeTimers,
}) => {
  if (clearTurnTimer) {
    clearTurnTimer({ roomId: room.roomId });
  }

  if (!room?.game || room.game.status !== "playing") {
    return;
  }

  // 1. Bot "thinks" and rolls the dice after ~1100ms
  const rollTimeout = setTimeout(async () => {
    if (!room?.game || room.game.status !== "playing") return;
    if (room.game.currentTurn?.playerId !== botPlayer.userId) return;

    const diceValue = getRandomDiceValue();
    const rollResult = rollGameDice({
      game: room.game,
      playerId: botPlayer.userId,
      diceValue,
    });

    if (!rollResult.success) {
      console.error("[BOT] Failed to roll dice:", rollResult.reason);
      return;
    }

    room.game = rollResult.game;

    // Check if rolled finishes the game
    const finishCheck = checkGameFinished({ game: room.game });
    if (finishCheck.finished) {
      room.game = finishCheck.game;
      if (clearTurnTimer) {
        clearTurnTimer({ roomId: room.roomId });
      }
      io.to(room.roomId).emit("game_finished", {
        game: room.game,
        winner: finishCheck.winner,
      });
      return;
    }

    const legalMoves = getLegalMoves({ game: room.game });

    // Broadcast dice roll to all players
    io.to(room.roomId).emit("dice_rolled", {
      playerId: botPlayer.userId,
      diceValue: rollResult.diceValue,
      legalMoves,
      game: room.game,
      turnPassed: legalMoves.length === 0,
      reason: legalMoves.length === 0 ? "No legal moves. Turn passed." : null,
    });

    // If no legal moves, complete turn and pass
    if (legalMoves.length === 0) {
      const nextTurnResult = completeGameTurn({ game: room.game });
      if (nextTurnResult.success) {
        room.game = nextTurnResult.game;
        io.to(room.roomId).emit("turn_changed", {
          game: room.game,
          auto: true,
        });
        if (room.game.status === "playing" && startTurnTimer) {
          startTurnTimer({ io, room });
        }
      }
      return;
    }

    // 2. Bot selects best tactical move after ~900ms
    const moveTimeout = setTimeout(async () => {
      if (!room?.game || room.game.status !== "playing") return;
      if (room.game.currentTurn?.playerId !== botPlayer.userId) return;

      const chosenMove = decideBotMove({
        game: room.game,
        legalMoves,
        botColor: botPlayer.color,
      });

      if (!chosenMove) return;

      const moveResult = moveCoin({
        game: room.game,
        playerId: botPlayer.userId,
        coinId: chosenMove.coinId,
        direction: chosenMove.direction,
      });

      if (!moveResult.success) {
        console.error("[BOT] Failed to move coin:", moveResult.reason);
        return;
      }

      room.game = moveResult.game;

      io.to(room.roomId).emit("coin_moved", {
        game: room.game,
        coinId: chosenMove.coinId,
        direction: chosenMove.direction,
        capture: moveResult.capture,
        auto: false,
      });

      // Check if this move won the game
      const finalFinishCheck = checkGameFinished({ game: room.game });
      if (finalFinishCheck.finished) {
        room.game = finalFinishCheck.game;
        if (clearTurnTimer) {
          clearTurnTimer({ roomId: room.roomId });
        }
        io.to(room.roomId).emit("game_finished", {
          game: room.game,
          winner: finalFinishCheck.winner,
        });
        return;
      }

      // If extra turn, bot rolls again!
      if (room.game.currentTurn?.extraTurn) {
        const extraTurnResult = prepareGameExtraTurn({ game: room.game });
        if (extraTurnResult.success) {
          room.game = extraTurnResult.game;
          io.to(room.roomId).emit("turn_changed", {
            game: room.game,
            auto: true,
          });
          if (startTurnTimer) {
            startTurnTimer({ io, room });
          }
        }
        return;
      }

      // Normal turn completion
      const nextTurn = completeGameTurn({ game: room.game });
      if (nextTurn.success) {
        room.game = nextTurn.game;
        io.to(room.roomId).emit("turn_changed", {
          game: room.game,
          auto: true,
        });
        if (room.game.status === "playing" && startTurnTimer) {
          startTurnTimer({ io, room });
        }
      }
    }, 900);

    if (activeTimers) {
      activeTimers.set(room.roomId, { timeout: moveTimeout });
    }
  }, 1100);

  if (activeTimers) {
    activeTimers.set(room.roomId, { timeout: rollTimeout });
  }
};
