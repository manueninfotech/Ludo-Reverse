import DailyReward from "../../models/DailyReward.js";
import { addCoins } from "../coins/coinService.js";

const DAILY_REWARDS = {
  1: 50,
  2: 75,
  3: 100,
  4: 125,
  5: 150,
  6: 200,
  7: 500,
};

// 24 hours required between claims
const CLAIM_COOLDOWN = 24 * 60 * 60 * 1000;
// If more than 48 hours pass since last claim, the player missed their streak
const STREAK_EXPIRY = 48 * 60 * 60 * 1000;

export const getDailyRewardStatus = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  let reward = await DailyReward.findOne({ userId });

  if (!reward) {
    reward = await DailyReward.create({
      userId,
      currentDay: 1,
      lastClaimedAt: null,
    });
  }

  const now = Date.now();

  // If player missed the streak (> 48 hours since last claim),
  // reset progress back to Day 1
  if (
    reward.lastClaimedAt &&
    now - reward.lastClaimedAt.getTime() >= STREAK_EXPIRY &&
    reward.currentDay !== 1
  ) {
    reward.currentDay = 1;
    await DailyReward.updateOne(
      { userId },
      { $set: { currentDay: 1 } }
    );
  }

  const canClaim =
    !reward.lastClaimedAt ||
    now - reward.lastClaimedAt.getTime() >= CLAIM_COOLDOWN;

  const rewardAmount = DAILY_REWARDS[reward.currentDay] || 50;

  return {
    currentDay: reward.currentDay,
    rewardAmount,
    lastClaimedAt: reward.lastClaimedAt,
    canClaim,
    nextClaimAt: canClaim
      ? null
      : new Date(reward.lastClaimedAt.getTime() + CLAIM_COOLDOWN),
  };
};

export const claimDailyReward = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  // Ensure record exists
  await DailyReward.updateOne(
    { userId },
    {
      $setOnInsert: {
        userId,
        currentDay: 1,
        lastClaimedAt: null,
      },
    },
    { upsert: true }
  );

  const now = new Date();
  const cooldownThreshold = new Date(now.getTime() - CLAIM_COOLDOWN);
  const streakExpiryThreshold = new Date(now.getTime() - STREAK_EXPIRY);

  // If the player missed their streak (> 48 hours since last claim),
  // reset currentDay back to Day 1 before claiming
  await DailyReward.updateOne(
    {
      userId,
      lastClaimedAt: { $lt: streakExpiryThreshold, $ne: null },
      currentDay: { $ne: 1 },
    },
    {
      $set: { currentDay: 1 },
    }
  );

  // Atomically acquire claim: only succeeds if cooldown has passed or first claim
  const rewardBeforeClaim = await DailyReward.findOneAndUpdate(
    {
      userId,
      $or: [
        { lastClaimedAt: null },
        { lastClaimedAt: { $lte: cooldownThreshold } },
      ],
    },
    {
      $set: { lastClaimedAt: now },
    },
    { returnDocument: "before" }
  );

  if (!rewardBeforeClaim) {
    throw new Error("Daily reward is not available yet.");
  }

  const claimedDay = rewardBeforeClaim.currentDay;
  const rewardAmount = DAILY_REWARDS[claimedDay] || 50;

  await addCoins(userId, rewardAmount);

  const nextDay = claimedDay === 7 ? 1 : claimedDay + 1;
  await DailyReward.updateOne(
    { userId },
    { $set: { currentDay: nextDay } }
  );

  return {
    claimedDay,
    rewardAmount,
    nextDay,
    claimedAt: now,
  };
};