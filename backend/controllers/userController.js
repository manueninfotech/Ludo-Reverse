import { getOrCreateUserStats } from "../services/stats/userStatsService.js";
import MatchRecord from "../models/MatchRecord.js";

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
  settings: user.settings || {
    sfxEnabled: true,
    sfxVolume: 0.85,
    musicEnabled: true,
    musicVolume: 0.70,
    hapticFeedback: true,
    confirmDirection: true,
    highlightLegalMoves: true,
    autoSelectSingleMove: false,
  },
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

// ============================================================
// UPDATE MY SETTINGS
// PUT /api/users/settings
// ============================================================

export const updateMySettings = async (req, res) => {
  try {
    const {
      sfxEnabled,
      sfxVolume,
      musicEnabled,
      musicVolume,
      hapticFeedback,
      confirmDirection,
      highlightLegalMoves,
      autoSelectSingleMove,
    } = req.body;

    if (!req.user.settings) {
      req.user.settings = {};
    }

    if (typeof sfxEnabled === "boolean") req.user.settings.sfxEnabled = sfxEnabled;
    if (typeof sfxVolume === "number") req.user.settings.sfxVolume = Math.max(0, Math.min(1, sfxVolume));
    if (typeof musicEnabled === "boolean") req.user.settings.musicEnabled = musicEnabled;
    if (typeof musicVolume === "number") req.user.settings.musicVolume = Math.max(0, Math.min(1, musicVolume));
    if (typeof hapticFeedback === "boolean") req.user.settings.hapticFeedback = hapticFeedback;
    if (typeof confirmDirection === "boolean") req.user.settings.confirmDirection = confirmDirection;
    if (typeof highlightLegalMoves === "boolean") req.user.settings.highlightLegalMoves = highlightLegalMoves;
    if (typeof autoSelectSingleMove === "boolean") req.user.settings.autoSelectSingleMove = autoSelectSingleMove;

    await req.user.save();

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully.",
      settings: req.user.settings,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ============================================================
// GET MATCH HISTORY
// GET /api/users/matches
// ============================================================

export const getMyMatchHistory = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const matches = await MatchRecord.find({ userId: req.user.userId })
      .sort({ playedAt: -1 })
      .limit(limit)
      .lean();

    const formatted = matches.map((m) => ({
      id: m._id.toString(),
      result: m.result,
      gameType: m.gameType,
      score: m.score,
      coinsAwarded: m.coinsAwarded,
      isWin: m.isWin,
      playedAt: m.playedAt,
    }));

    return res.status(200).json({
      success: true,
      matches: formatted,
    });
  } catch (error) {
    console.error("Get match history error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// ============================================================
// RECORD USER MATCH
// POST /api/users/matches
// ============================================================

export const recordUserMatch = async (req, res) => {
  try {
    const { result, gameType, coinsAwarded, isWin, playedAt, roomId } = req.body;

    const validatedResult = result === "WIN" ? "WIN" : "LOSS";
    const validatedIsWin = Boolean(isWin ?? (validatedResult === "WIN"));
    const safeCoins = typeof coinsAwarded === "number" ? Math.max(0, Math.min(1000, Math.floor(coinsAwarded))) : 0;
    const safeGameType = typeof gameType === "string" ? gameType.trim().slice(0, 40) : "Classic Match";
    const safeScore = safeCoins > 0 ? `+${safeCoins} Coins` : "+0 Coins";
    const safeRoomId = typeof roomId === "string" ? roomId.trim().slice(0, 20) : null;

    const match = await MatchRecord.create({
      userId: req.user.userId,
      result: validatedResult,
      gameType: safeGameType,
      score: safeScore,
      coinsAwarded: safeCoins,
      isWin: validatedIsWin,
      roomId: safeRoomId,
      playedAt: playedAt && !isNaN(new Date(playedAt).getTime()) ? new Date(playedAt) : new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Match recorded successfully.",
      match: {
        id: match._id.toString(),
        result: match.result,
        gameType: match.gameType,
        score: match.score,
        coinsAwarded: match.coinsAwarded,
        isWin: match.isWin,
        playedAt: match.playedAt,
      },
    });
  } catch (error) {
    console.error("Record match error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};