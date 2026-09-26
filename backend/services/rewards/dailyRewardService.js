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

const CLAIM_COOLDOWN = 24 * 60 * 60 * 1000;

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

  const canClaim =
    !reward.lastClaimedAt ||
    now - reward.lastClaimedAt.getTime() >=
      CLAIM_COOLDOWN;

  const rewardAmount =
    DAILY_REWARDS[reward.currentDay];

  return {
    currentDay: reward.currentDay,
    rewardAmount,
    lastClaimedAt: reward.lastClaimedAt,
    canClaim,
    nextClaimAt: canClaim
      ? null
      : new Date(
          reward.lastClaimedAt.getTime() +
            CLAIM_COOLDOWN
        ),
  };
};

export const claimDailyReward = async (userId) => {
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

  if (
    reward.lastClaimedAt &&
    now - reward.lastClaimedAt.getTime() <
      CLAIM_COOLDOWN
  ) {
    throw new Error(
      "Daily reward is not available yet."
    );
  }

  const claimedDay = reward.currentDay;
  const rewardAmount = DAILY_REWARDS[claimedDay];

  await addCoins(userId, rewardAmount);

  reward.currentDay =
    claimedDay === 7
      ? 1
      : claimedDay + 1;

  reward.lastClaimedAt = new Date();

  await reward.save();

  return {
    claimedDay,
    rewardAmount,
    nextDay: reward.currentDay,
    claimedAt: reward.lastClaimedAt,
  };
};