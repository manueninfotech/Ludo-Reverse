import {
  getDailyRewardStatus,
  claimDailyReward,
} from "../services/rewards/dailyRewardService.js";

export const getDailyReward = async (req, res) => {
  try {
    const userId = req.user.userId;

    const reward = await getDailyRewardStatus(userId);

    return res.status(200).json({
      success: true,
      reward,
    });
  } catch (error) {
    console.error(
      "Get daily reward error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get daily reward.",
    });
  }
};

export const claimReward = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await claimDailyReward(userId);

    return res.status(200).json({
      success: true,
      message: "Daily reward claimed successfully.",
      result,
    });
  } catch (error) {
    console.error(
      "Claim daily reward error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};