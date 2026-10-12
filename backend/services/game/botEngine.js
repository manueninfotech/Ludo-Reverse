import { getBoardConfig } from "./boardConfig.js";

/**
 * Evaluates all legal moves for a server-side bot and returns the highest-value tactical move.
 * Mirrors the client-side BotAiEngine heuristics for full tactical parity:
 * 1. Tactical Reverse Ambush (cutting an opponent in reverse direction)
 * 2. Forward Cut (cutting an opponent in forward direction)
 * 3. Reaching Home Goal directly (to.area === 'finished')
 * 4. Unlocking token from base on a 6 roll (from.area === 'base')
 * 5. Advancing token in home path (to.area === 'home')
 * 6. Default: advancing the token with the highest progress on track
 *
 * @param {Object} params
 * @param {Object} params.game - The active Game state
 * @param {Array} params.legalMoves - Array of legal move objects from gameEngine.getLegalMoves()
 * @param {string} params.botColor - The color of the bot player
 * @returns {Object|null} The chosen move object { coinId, direction, ... }
 */
export const decideBotMove = ({
  game,
  legalMoves,
  botColor,
}) => {
  if (!Array.isArray(legalMoves) || legalMoves.length === 0) {
    return null;
  }

  // If only 1 move is legal, take it immediately
  if (legalMoves.length === 1) {
    return legalMoves[0];
  }

  const playerCount = game.playerCount || 4;
  const board = getBoardConfig(playerCount);
  const safeCells = board?.safeCells || [];

  // Helper to check if landing on a target cell captures any opponent token
  const willCaptureOpponent = (toAbsoluteCell) => {
    if (!Number.isInteger(toAbsoluteCell)) return false;
    if (safeCells.includes(toAbsoluteCell)) return false;

    // Check all opponent coins in the game
    for (const player of game.players) {
      if (player.color.toLowerCase() === botColor.toLowerCase()) continue;
      for (const coin of player.coins) {
        if (coin.area === "main" && coin.cell === toAbsoluteCell) {
          return true;
        }
      }
    }
    return false;
  };

  // 1. TACTICAL REVERSE AMBUSH: Check if any reverse move captures an opponent!
  for (const move of legalMoves) {
    if (move.direction === "backward" && willCaptureOpponent(move.to?.cell)) {
      return move;
    }
  }

  // 2. FORWARD CUT: Check if any forward move captures an opponent!
  for (const move of legalMoves) {
    if (move.direction === "forward" && willCaptureOpponent(move.to?.cell)) {
      return move;
    }
  }

  // 3. REACH FINISH: Reaching Home Goal directly
  for (const move of legalMoves) {
    if (move.to?.area === "finished") {
      return move;
    }
  }

  // 4. UNLOCK FROM BASE: If rolled 6, prioritize bringing tokens onto the board
  if (game.currentTurn?.diceValue === 6) {
    for (const move of legalMoves) {
      if (move.from?.area === "base") {
        return move;
      }
    }
  }

  // 5. ADVANCE IN HOME PATH: Safe progression towards goal
  for (const move of legalMoves) {
    if (move.to?.area === "home") {
      return move;
    }
  }

  // 6. DEFAULT: Prefer forward move of the coin with the highest progress
  const sortedMoves = [...legalMoves].sort((a, b) => {
    const progA = a.from?.progress ?? 0;
    const progB = b.from?.progress ?? 0;
    // Prefer higher progress
    if (progB !== progA) return progB - progA;
    // Prefer forward over backward if progress is equal
    if (a.direction === "forward" && b.direction !== "forward") return -1;
    if (b.direction === "forward" && a.direction !== "forward") return 1;
    return 0;
  });

  return sortedMoves[0];
};
