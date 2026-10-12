import Friendship from "../models/Friendship.js";
import User from "../models/User.js";
import UserStats from "../models/UserStats.js";
import { friendPresence } from "../services/friends/friendPresence.js";

/**
 * GET /api/friends
 * Returns all accepted friends with online presence, plus pending incoming/outgoing requests.
 */
export const getFriends = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    // 1. Fetch all friendships involving the current user
    const friendships = await Friendship.find({
      $or: [{ requesterId: currentUserId }, { recipientId: currentUserId }],
    }).lean();

    const acceptedFriendUserIds = [];
    const incomingRequests = [];
    const outgoingRequests = [];

    for (const f of friendships) {
      if (f.status === "accepted") {
        const friendId =
          f.requesterId === currentUserId ? f.recipientId : f.requesterId;
        acceptedFriendUserIds.push({
          friendId,
          friendshipId: f._id,
          since: f.updatedAt,
        });
      } else if (f.status === "pending") {
        if (f.recipientId === currentUserId) {
          incomingRequests.push({
            friendshipId: f._id,
            requesterId: f.requesterId,
            createdAt: f.createdAt,
          });
        } else {
          outgoingRequests.push({
            friendshipId: f._id,
            recipientId: f.recipientId,
            createdAt: f.createdAt,
          });
        }
      }
    }

    // 2. Fetch User profiles for all relevant user IDs
    const allUserIdsToFetch = [
      ...acceptedFriendUserIds.map((item) => item.friendId),
      ...incomingRequests.map((item) => item.requesterId),
      ...outgoingRequests.map((item) => item.recipientId),
    ];

    const users = await User.find({
      userId: { $in: allUserIdsToFetch },
    })
      .select("userId username displayName avatar coins status")
      .lean();

    const userMap = new Map(users.map((u) => [u.userId, u]));

    // 3. Fetch basic stats (gamesWon, gamesPlayed) for friends
    const stats = await UserStats.find({
      userId: { $in: acceptedFriendUserIds.map((item) => item.friendId) },
    })
      .select("userId gamesPlayed gamesWon winStreak")
      .lean();

    const statsMap = new Map(stats.map((s) => [s.userId, s]));

    // 4. Construct rich friend list
    const friends = acceptedFriendUserIds
      .map((item) => {
        const user = userMap.get(item.friendId);
        if (!user) return null;
        const userStat = statsMap.get(item.friendId) || {};
        return {
          friendshipId: item.friendshipId,
          userId: user.userId,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          coins: user.coins,
          gamesPlayed: userStat.gamesPlayed || 0,
          gamesWon: userStat.gamesWon || 0,
          winStreak: userStat.winStreak || 0,
          isOnline: friendPresence.isOnline(user.userId),
          friendsSince: item.since,
        };
      })
      .filter(Boolean);

    // 5. Construct incoming requests with sender info
    const formattedIncoming = incomingRequests
      .map((reqItem) => {
        const user = userMap.get(reqItem.requesterId);
        if (!user) return null;
        return {
          friendshipId: reqItem.friendshipId,
          userId: user.userId,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          createdAt: reqItem.createdAt,
        };
      })
      .filter(Boolean);

    // 6. Construct outgoing requests with recipient info
    const formattedOutgoing = outgoingRequests
      .map((reqItem) => {
        const user = userMap.get(reqItem.recipientId);
        if (!user) return null;
        return {
          friendshipId: reqItem.friendshipId,
          userId: user.userId,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          createdAt: reqItem.createdAt,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      friends,
      incomingRequests: formattedIncoming,
      outgoingRequests: formattedOutgoing,
      totalFriends: friends.length,
      onlineCount: friends.filter((f) => f.isOnline).length,
    });
  } catch (error) {
    console.error("getFriends error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve friends list.",
    });
  }
};

/**
 * POST /api/friends/request
 * Send a friend request by username or userId.
 */
export const sendFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { targetUsername, targetUserId } = req.body || {};

    if (!targetUsername && !targetUserId) {
      return res.status(400).json({
        success: false,
        message: "targetUsername or targetUserId is required.",
      });
    }

    // Find the target user by userId or username
    const query = targetUserId
      ? { userId: targetUserId }
      : {
          $or: [
            { userId: targetUsername.trim() },
            { username: targetUsername.trim().toLowerCase() },
          ],
        };

    const targetUser = await User.findOne(query).select("userId username displayName avatar").lean();

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (targetUser.userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a friend request to yourself.",
      });
    }

    // Check existing friendship
    const existing = await Friendship.findOne({
      $or: [
        { requesterId: currentUserId, recipientId: targetUser.userId },
        { requesterId: targetUser.userId, recipientId: currentUserId },
      ],
    });

    if (existing) {
      if (existing.status === "accepted") {
        return res.status(400).json({
          success: false,
          message: "You are already friends with this user.",
        });
      }

      if (existing.status === "pending") {
        if (existing.requesterId === currentUserId) {
          return res.status(400).json({
            success: false,
            message: "Friend request is already pending.",
          });
        } else {
          // The other user already sent a request to us! Auto-accept!
          existing.status = "accepted";
          await existing.save();

          // Notify target user via socket if online
          const io = req.app.get("io");
          if (io) {
            const targetSockets = friendPresence.getUserSockets(targetUser.userId);
            for (const sId of targetSockets) {
              io.to(sId).emit("friend_request_accepted", {
                friendshipId: existing._id,
                userId: req.user.userId,
                displayName: req.user.displayName,
              });
            }
          }

          return res.status(200).json({
            success: true,
            message: "Mutual request found! You are now friends.",
            friendship: existing,
          });
        }
      }

      // If rejected or cancelled earlier, reset to pending
      existing.requesterId = currentUserId;
      existing.recipientId = targetUser.userId;
      existing.status = "pending";
      await existing.save();

      return res.status(200).json({
        success: true,
        message: "Friend request sent successfully.",
        friendship: existing,
      });
    }

    // Create new pending friendship
    const newFriendship = await Friendship.create({
      requesterId: currentUserId,
      recipientId: targetUser.userId,
      status: "pending",
    });

    // Notify target user live via socket if connected
    const io = req.app.get("io");
    if (io) {
      const targetSockets = friendPresence.getUserSockets(targetUser.userId);
      for (const sId of targetSockets) {
        io.to(sId).emit("friend_request_received", {
          friendshipId: newFriendship._id,
          requesterId: currentUserId,
          requesterName: req.user.displayName,
          createdAt: newFriendship.createdAt,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: `Friend request sent to ${targetUser.displayName}.`,
      friendship: newFriendship,
    });
  } catch (error) {
    console.error("sendFriendRequest error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send friend request.",
    });
  }
};

/**
 * POST /api/friends/accept/:friendshipId
 * Accept an incoming friend request.
 */
export const acceptFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { friendshipId } = req.params;

    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: "Friend request not found.",
      });
    }

    if (friendship.recipientId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to accept this friend request.",
      });
    }

    if (friendship.status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "Friend request is already accepted.",
      });
    }

    friendship.status = "accepted";
    await friendship.save();

    // Notify requester via socket if online
    const io = req.app.get("io");
    if (io) {
      const requesterSockets = friendPresence.getUserSockets(friendship.requesterId);
      for (const sId of requesterSockets) {
        io.to(sId).emit("friend_request_accepted", {
          friendshipId: friendship._id,
          userId: currentUserId,
          displayName: req.user.displayName,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Friend request accepted.",
      friendship,
    });
  } catch (error) {
    console.error("acceptFriendRequest error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept friend request.",
    });
  }
};

/**
 * POST /api/friends/reject/:friendshipId
 * Reject / decline an incoming friend request.
 */
export const rejectFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { friendshipId } = req.params;

    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: "Friend request not found.",
      });
    }

    if (friendship.recipientId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to decline this friend request.",
      });
    }

    await Friendship.findByIdAndDelete(friendshipId);

    return res.status(200).json({
      success: true,
      message: "Friend request declined.",
    });
  } catch (error) {
    console.error("rejectFriendRequest error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to decline friend request.",
    });
  }
};

/**
 * DELETE /api/friends/:friendshipId
 * Remove an existing friend.
 */
export const removeFriend = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { friendshipId } = req.params;

    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: "Friendship not found.",
      });
    }

    if (
      friendship.requesterId !== currentUserId &&
      friendship.recipientId !== currentUserId
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to remove this friend.",
      });
    }

    await Friendship.findByIdAndDelete(friendshipId);

    return res.status(200).json({
      success: true,
      message: "Friend removed successfully.",
    });
  } catch (error) {
    console.error("removeFriend error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove friend.",
    });
  }
};

/**
 * GET /api/friends/search?q=...
 * Search for players by username or displayName, returning their friendship status.
 */
export const searchUsers = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const query = (req.query.q || "").trim();

    if (!query || query.length < 2) {
      return res.status(200).json({
        success: true,
        users: [],
      });
    }

    const regex = new RegExp(query, "i");

    const matchedUsers = await User.find({
      userId: { $ne: currentUserId },
      status: "active",
      $or: [
        { userId: query },
        { username: regex },
        { displayName: regex },
      ],
    })
      .select("userId username displayName avatar coins")
      .limit(15)
      .lean();

    if (matchedUsers.length === 0) {
      return res.status(200).json({
        success: true,
        users: [],
      });
    }

    const targetUserIds = matchedUsers.map((u) => u.userId);

    const existingFriendships = await Friendship.find({
      $or: [
        { requesterId: currentUserId, recipientId: { $in: targetUserIds } },
        { requesterId: { $in: targetUserIds }, recipientId: currentUserId },
      ],
    }).lean();

    const relationshipMap = new Map();
    for (const f of existingFriendships) {
      if (f.status === "accepted") {
        const otherId = f.requesterId === currentUserId ? f.recipientId : f.requesterId;
        relationshipMap.set(otherId, { status: "friends", friendshipId: f._id });
      } else if (f.status === "pending") {
        if (f.requesterId === currentUserId) {
          relationshipMap.set(f.recipientId, { status: "request_sent", friendshipId: f._id });
        } else {
          relationshipMap.set(f.requesterId, { status: "request_received", friendshipId: f._id });
        }
      }
    }

    const results = matchedUsers.map((u) => {
      const rel = relationshipMap.get(u.userId) || { status: "none", friendshipId: null };
      return {
        userId: u.userId,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        coins: u.coins,
        isOnline: friendPresence.isOnline(u.userId),
        friendshipStatus: rel.status,
        friendshipId: rel.friendshipId,
      };
    });

    return res.status(200).json({
      success: true,
      users: results,
    });
  } catch (error) {
    console.error("searchUsers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search users.",
    });
  }
};
