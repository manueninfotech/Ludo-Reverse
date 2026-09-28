import { getOrCreateUserStats } from "../services/stats/userStatsService.js";

// ============================================================
// USER RESPONSE
// ============================================================

const getUserData = (user) => ({
  userId: user.userId,
  username: user.username,
  email: user.email,
  displayName: user.displayName,
  avatar: user.avatar,
  isEmailVerified: user.isEmailVerified,
  status: user.status,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const getStatsData = (stats) => ({
  gamesPlayed: stats.gamesPlayed,
  gamesWon: stats.gamesWon,
  gamesLost: stats.gamesLost,
  gamesDrawn: stats.gamesDrawn,
  gamesAbandoned: stats.gamesAbandoned,
  gamesDisconnected: stats.gamesDisconnected,

  totalKills: stats.totalKills,
  totalCoinsFinished: stats.totalCoinsFinished,
  totalMoves: stats.totalMoves,
  totalSixes: stats.totalSixes,
  totalBackwardMoves: stats.totalBackwardMoves,
  totalForwardMoves: stats.totalForwardMoves,

  highestKillsInGame: stats.highestKillsInGame,
  longestWinStreak: stats.longestWinStreak,
  currentWinStreak: stats.currentWinStreak,

  totalPlayTime: stats.totalPlayTime,

  updatedAt: stats.updatedAt,
});
// ============================================================
// GET MY PROFILE
// GET /api/users/me
// ============================================================

export const getMyProfile = async (req, res) => {
  try {
    const stats = await getOrCreateUserStats(
      req.user.userId
    );

    return res.status(200).json({
      success: true,

      user: {
        ...getUserData(req.user),
        coins: req.user.coins ?? 0,
      },

      stats: getStatsData(stats),
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ============================================================
// UPDATE MY PROFILE
// PATCH /api/users/me
// ============================================================

export const updateMyProfile = async (req, res) => {
  try {
    const { displayName, avatar } = req.body;

    if (
      displayName === undefined &&
      avatar === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required.",
      });
    }

    // --------------------------------------------------------
    // DISPLAY NAME
    // --------------------------------------------------------

    if (displayName !== undefined) {
      if (typeof displayName !== "string") {
        return res.status(400).json({
          success: false,
          message: "Display name must be a string.",
        });
      }

      const trimmedDisplayName = displayName.trim();

      if (!trimmedDisplayName) {
        return res.status(400).json({
          success: false,
          message: "Display name cannot be empty.",
        });
      }

      if (trimmedDisplayName.length > 50) {
        return res.status(400).json({
          success: false,
          message: "Display name cannot exceed 50 characters.",
        });
      }

      req.user.displayName = trimmedDisplayName;
    }

    // --------------------------------------------------------
    // AVATAR
    // --------------------------------------------------------

    if (avatar !== undefined) {
      if (
        avatar !== null &&
        typeof avatar !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Avatar must be a string or null.",
        });
      }

      req.user.avatar = avatar;
    }

    await req.user.save();

    // Get/create stats so the response always contains stats
    const stats = await getOrCreateUserStats(
      req.user.userId
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",

      user: getUserData(req.user),

      stats: getStatsData(stats),
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};