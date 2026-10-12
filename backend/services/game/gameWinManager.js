import { completeGameTurn } from "./gameTurnLifecycle.js";

export const checkWinner = ({
  game,
}) => {
  if (!game || !Array.isArray(game.players)) {
    return null;
  }

  const winner = game.players.find(
    (player) =>
      Array.isArray(player.coins) &&
      player.coins.length === 4 &&
      player.coins.every(
        (coin) => coin.area === "finished"
      )
  );

  return winner || null;
};

export const checkGameFinished = ({
  game,
}) => {
  if (
    !game ||
    !Array.isArray(game.players)
  ) {
    return {
      finished: false,
      game,
    };
  }

  const finishOrder = Array.isArray(game.finishOrder)
    ? [...game.finishOrder]
    : [];

  // ------------------------------------------------------
  // FIND A NEWLY FINISHED PLAYER
  // ------------------------------------------------------
  const newlyFinishedPlayer = game.players.find((player) => {
    const alreadyFinished = finishOrder.includes(player.userId);

    const allCoinsFinished =
      Array.isArray(player.coins) &&
      player.coins.length === 4 &&
      player.coins.every(
        (coin) => coin.area === "finished"
      );

    return allCoinsFinished && !alreadyFinished;
  });

  // Nobody newly finished.
  if (!newlyFinishedPlayer) {
    return {
      finished: false,
      game: {
        ...game,
        finishOrder,
      },
    };
  }

  // Add player to finishing order.
  finishOrder.push(newlyFinishedPlayer.userId);

  // ------------------------------------------------------
  // LAST ACTIVE PLAYER
  // ------------------------------------------------------
  const remainingPlayers = game.players.filter(
    (player) => !finishOrder.includes(player.userId)
  );

  // If only one player remains, that player is last place.
  if (remainingPlayers.length <= 1) {
    if (remainingPlayers.length === 1) {
      finishOrder.push(remainingPlayers[0].userId);
    }

    return {
      finished: true,

      game: {
        ...game,

        status: "finished",

        winnerId: finishOrder[0] || null,

        finishOrder,
      },

      winner:
        game.players.find(
          (player) => player.userId === finishOrder[0]
        ) || null,
    };
  }

  // ------------------------------------------------------
  // GAME CONTINUES
  // ------------------------------------------------------
  const gameWithFinishOrder = {
    ...game,

    status: "playing",

    winnerId: finishOrder[0] || null,

    finishOrder,
  };

  // Move immediately to the next active player.
  const nextTurnResult = completeGameTurn({
    game: gameWithFinishOrder,
  });

  if (!nextTurnResult.success) {
    return {
      finished: false,
      game: gameWithFinishOrder,
    };
  }

  return {
    finished: false,

    game: nextTurnResult.game,

    winner: newlyFinishedPlayer,
  };
};
