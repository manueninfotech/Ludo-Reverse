import {
  getBoardConfig,
  getBoardType,
  getPlayerBoardInfo,
} from "./boardConfig.js";

import { startTurn } from "./turn.js";

export const createInitialGameState = ({
  playerCount,
  players,
}) => {
  if (
    !Number.isInteger(playerCount) ||
    playerCount < 2 ||
    playerCount > 8
  ) {
    throw new Error(
      "Player count must be between 2 and 8."
    );
  }

  if (!Array.isArray(players)) {
    throw new Error("Players must be an array.");
  }

  if (players.length !== playerCount) {
    throw new Error(
      "Player count does not match players array."
    );
  }

  const board = getBoardConfig(playerCount);

  const preparedPlayers = players.map(
    (player) => {
      const boardInfo = getPlayerBoardInfo(
        playerCount,
        player.color
      );

      if (!boardInfo) {
        throw new Error(
          `Invalid color for ${playerCount}-player game: ${player.color}`
        );
      }

      return {
        ...player,

        startCell: boardInfo.startCell,

        coins: Array.from(
          { length: board.coinsPerPlayer },
          (_, coinIndex) => ({
            coinId: `${player.userId}-coin-${coinIndex + 1}`,

            area: "base",

            progress: -1,

            absoluteCell: null,
          })
        ),

        isReady: player.isReady ?? false,

        isConnected: player.isConnected ?? true,

        missedTurns: player.missedTurns ?? 0,
      };
    }
  );

  const firstPlayer = preparedPlayers[0];

  const turn = startTurn({
    playerId: firstPlayer.userId,
  });

  return {
    status: "playing",

    playerCount,

    boardType: getBoardType(playerCount),

    players: preparedPlayers,

    currentTurn: turn,

    winnerId: null,

    moveCount: 0,
  };
};

export const getCurrentPlayer = (game) => {
  if (!game || !game.currentTurn) {
    return null;
  }

  return (
    game.players?.find(
      (player) =>
        player.userId === game.currentTurn.playerId
    ) || null
  );
};

export const getPlayerById = ({
  game,
  playerId,
}) => {
  if (!game || !Array.isArray(game.players)) {
    return null;
  }

  return (
    game.players.find(
      (player) => player.userId === playerId
    ) || null
  );
};

export const getCoin = ({
  player,
  coinId,
}) => {
  if (!player || !Array.isArray(player.coins)) {
    return null;
  }

  return (
    player.coins.find(
      (coin) => coin.coinId === coinId
    ) || null
  );
};
