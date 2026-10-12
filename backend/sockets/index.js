import { registerLocalGameHandler } from "./handlers/localGameHandler.js";
import { registerRoomHandler } from "./handlers/roomHandler.js";
import { registerGameHandler } from "./handlers/gameHandler.js";
import { registerFriendHandler } from "./handlers/friendHandler.js";

/**
 * Main Socket.IO delegator that registers modular handlers:
 * - Room lifecycle & connections (create, join, resume, leave, disconnect)
 * - Real-time multiplayer game actions (roll dice, move coin)
 * - Local & pass-and-play game actions
 * - Friend presence & game invitations
 *
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
export const registerRoomSocket = (io, socket) => {
  registerLocalGameHandler(io, socket);
  registerRoomHandler(io, socket);
  registerGameHandler(io, socket);
  registerFriendHandler(io, socket);
};

export default registerRoomSocket;
