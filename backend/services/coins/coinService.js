import mongoose from "mongoose";
import User from "../../models/User.js";

export const ENTRY_FEE = 100;

export const getCoinRewardForPosition = ({
  position,
  playerCount,
}) => {
  if (
    !Number.isInteger(position) ||
    !Number.isInteger(playerCount) ||
    position < 1 ||
    playerCount < 2 ||
    position > playerCount
  ) {
    return 0;
  }

  // 1st place
  if (position === 1) {
    return 200;
  }

  // 2nd place gets coins only when
  // there are 3 or more players.
  if (
    position === 2 &&
    playerCount >= 3
  ) {
    return 100;
  }

  // 3rd place gets coins only when
  // there are 4 or more players.
  if (
    position === 3 &&
    playerCount >= 4
  ) {
    return 50;
  }

  // All remaining positions get no coins.
  return 0;
};

export const getUserCoins = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const user = await User.findOne(
    { userId },
    { coins: 1 }
  );

  if (!user) {
    throw new Error("User not found.");
  }

  return user.coins ?? 0;
};

export const deductEntryFee = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const updatedUser = await User.findOneAndUpdate(
    {
      userId,
      coins: { $gte: ENTRY_FEE },
    },
    {
      $inc: {
        coins: -ENTRY_FEE,
      },
    },
    {
      returnDocument: "after",
    }
  );

  if (!updatedUser) {
    const user = await User.findOne(
      { userId },
      { coins: 1 }
    );

    if (!user) {
      throw new Error("User not found.");
    }

    throw new Error(
      `Insufficient coins. You need ${ENTRY_FEE} coins to enter the game.`
    );
  }

  return {
    userId,
    deducted: ENTRY_FEE,
    remainingCoins: updatedUser.coins,
  };
};

export const deductEntryFees = async (userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error("Players are required.");
  }

  const uniqueUserIds = [...new Set(userIds)];

  const session = await mongoose.startSession();

  try {
    let results = [];

    await session.withTransaction(async () => {
      const users = await User.find(
        {
          userId: { $in: uniqueUserIds },
        },
        {
          userId: 1,
          coins: 1,
        }
      ).session(session);

      if (users.length !== uniqueUserIds.length) {
        throw new Error(
          "One or more players could not be found."
        );
      }

      // Check EVERY player before deducting anything.
      const playerWithoutEnoughCoins = users.find(
        (user) => (user.coins ?? 0) < ENTRY_FEE
      );

      if (playerWithoutEnoughCoins) {
        throw new Error(
          `All players need at least ${ENTRY_FEE} coins to start the game.`
        );
      }

      // Deduct entry fee from every player.
      for (const userId of uniqueUserIds) {
        const updatedUser = await User.findOneAndUpdate(
          {
            userId,
            coins: { $gte: ENTRY_FEE },
          },
          {
            $inc: {
              coins: -ENTRY_FEE,
            },
          },
          {
            returnDocument: "after",
            session,
          }
        );

        if (!updatedUser) {
          throw new Error(
            "Coin deduction failed. The game was not started."
          );
        }

        results.push({
          userId,
          deducted: ENTRY_FEE,
          remainingCoins: updatedUser.coins,
        });
      }
    });

    return results;
  } finally {
    await session.endSession();
  }
};

export const addCoins = async (userId, amount) => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Coin amount must be a positive integer.");
  }

  const updatedUser = await User.findOneAndUpdate(
    { userId },
    {
      $inc: {
        coins: amount,
      },
    },
    {
      returnDocument: "after",
    }
  );

  if (!updatedUser) {
    throw new Error("User not found.");
  }

  return {
    userId,
    added: amount,
    totalCoins: updatedUser.coins,
  };
};