import { friendPresence } from "../../services/friends/friendPresence.js";
import { getRoom } from "../../services/room/roomManager.js";
import Friendship from "../../models/Friendship.js";

/**
 * Helper to notify a user's friends when their online presence changes
 */
const notifyFriendsOfPresence = async (io, userId, isOnline) => {
  try {
    const friendships = await Friendship.find({
      status: "accepted",
      $or: [{ requesterId: userId }, { recipientId: userId }],
    }).lean();

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.recipientId : f.requesterId
    );

    for (const friendId of friendIds) {
      const sockets = friendPresence.getUserSockets(friendId);
      for (const sId of sockets) {
        io.to(sId).emit("user_presence_changed", {
          userId,
          isOnline,
        });
      }
    }
  } catch (error) {
    console.error("notifyFriendsOfPresence error:", error);
  }
};

/**
 * Registers friend-related socket events (presence, real-time invites).
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
export const registerFriendHandler = (io, socket) => {
  const userId = socket.data?.userId;

  // Track socket connection for presence if authenticated
  if (userId) {
    const wasOffline = !friendPresence.isOnline(userId);
    friendPresence.addConnection(userId, socket.id);
    if (wasOffline) {
      notifyFriendsOfPresence(io, userId, true);
    }
  }

  // --------------------------------------------------------
  // INVITE FRIEND TO GAME
  // --------------------------------------------------------
  socket.on("invite_friend", (data, callback) => {
    const { friendUserId, roomId } = data || {};
    const inviterId = socket.data?.userId || data?.inviterId;

    if (!friendUserId || !roomId) {
      return callback?.({
        success: false,
        reason: "friendUserId and roomId are required.",
      });
    }

    const room = getRoom({ roomId });
    if (!room) {
      return callback?.({
        success: false,
        reason: "Room not found.",
      });
    }

    if (room.status !== "waiting") {
      return callback?.({
        success: false,
        reason: "Game has already started.",
      });
    }

    const inviterPlayer = room.players.find((p) => p.userId === inviterId);
    const inviterName = inviterPlayer?.name || "A friend";

    const friendSockets = friendPresence.getUserSockets(friendUserId);
    if (friendSockets.length === 0) {
      return callback?.({
        success: false,
        reason: "Friend is currently offline.",
      });
    }

    // Send invite to friend's connected sockets
    for (const sId of friendSockets) {
      io.to(sId).emit("game_invite_received", {
        roomId,
        inviterId,
        inviterName,
        maxPlayers: room.maxPlayers,
        currentPlayers: room.players.length,
      });
    }

    callback?.({
      success: true,
      message: `Invite sent to friend.`,
    });
  });

  // --------------------------------------------------------
  // DISCONNECT PRESENCE CLEANUP
  // --------------------------------------------------------
  socket.on("disconnect", () => {
    if (userId) {
      const isNowOffline = friendPresence.removeConnection(userId, socket.id);
      if (isNowOffline) {
        notifyFriendsOfPresence(io, userId, false);
      }
    }
  });
};
