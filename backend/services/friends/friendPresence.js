/**
 * In-memory presence tracker mapping userId -> Set of connected socketIds.
 * Supports multi-device / multi-tab connections.
 */
class FriendPresence {
  constructor() {
    this.onlineUsers = new Map();
  }

  addConnection(userId, socketId) {
    if (!userId || !socketId) return;
    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }
    this.onlineUsers.get(userId).add(socketId);
  }

  removeConnection(userId, socketId) {
    if (!userId || !this.onlineUsers.has(userId)) return false;
    const sockets = this.onlineUsers.get(userId);
    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.onlineUsers.delete(userId);
      return true; // Transitioned from online to offline
    }
    return false;
  }

  isOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  getUserSockets(userId) {
    const sockets = this.onlineUsers.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  getAllOnlineUserIds() {
    return Array.from(this.onlineUsers.keys());
  }
}

export const friendPresence = new FriendPresence();
