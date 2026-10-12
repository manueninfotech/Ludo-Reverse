import { createInitialGameState } from "../game/gameEngine.js";

const rooms = new Map();


// ----------------------------------------------------------
// Player Color Configuration
// ----------------------------------------------------------

const PLAYER_COLORS = {
  2: ["red", "green"],

  3: ["red", "green", "yellow"],

  4: ["red", "green", "yellow", "blue"],

  5: ["red", "green", "yellow", "blue", "orange"],

  6: ["red", "green", "orange", "blue", "yellow", "purple"],

  7: ["red", "green", "orange", "blue", "yellow", "purple", "pink",],

  8: ["red", "green", "orange", "blue", "yellow", "purple", "pink", "white"],
};


// ----------------------------------------------------------
// Generate Room ID
// ----------------------------------------------------------

const generateRoomCode = () => {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    const index = Math.floor(Math.random() * characters.length);
    code += characters[index];
  }

  return code;
};


const createUniqueRoomCode = () => {
  let roomId;

  do {
    roomId = generateRoomCode();
  } while (rooms.has(roomId));

  return roomId;
};


// ----------------------------------------------------------
// Get Color For New Player
// ----------------------------------------------------------

const getNextAvailableColor = ({
  maxPlayers,
  players,
}) => {
  const availableColors =
    PLAYER_COLORS[maxPlayers] || [];

  const usedColors = new Set(
    players.map((player) => player.color)
  );

  return (
    availableColors.find(
      (color) => !usedColors.has(color)
    ) || null
  );
};


// ----------------------------------------------------------
// Create Room
// ----------------------------------------------------------

export const createRoom = ({
  hostId,
  hostName,
  maxPlayers = 2,
  color,
  avatar,
}) => {

  if (![2, 3, 4, 5, 6, 7, 8].includes(maxPlayers)) {
    return {
      success: false,
      reason: "Maximum players must be between 2 and 8.",
    };
  }

  if (!hostId || !hostName?.trim()) {
    return {
      success: false,
      reason: "Host ID and name are required.",
    };
  }

  const roomId = createUniqueRoomCode();

  // Use chosen color if valid for this player count, otherwise first color
  const availableColors = PLAYER_COLORS[maxPlayers] || [];
  const hostColor =
    (color && availableColors.includes(color.toLowerCase()))
      ? color.toLowerCase()
      : availableColors[0];

  const host = {
    userId: hostId,
    name: hostName.trim(),
    color: hostColor,
    isHost: true,
    isConnected: true,
    avatar: avatar || null,
  };

  const room = {
    roomId,
    hostId,
    maxPlayers,
    status: "waiting",

    players: [
      host,
    ],

    game: null,
  };

  rooms.set(roomId, room);

  return {
    success: true,
    room,
  };
};


// ----------------------------------------------------------
// Get Room
// ----------------------------------------------------------

export const getRoom = ({ roomId }) => {
  return rooms.get(roomId) ?? null;
};


// ----------------------------------------------------------
// Join Room
// ----------------------------------------------------------

export const joinRoom = ({
  roomId,
  userId,
  name,
  avatar,
}) => {

  const room = rooms.get(roomId);

  if (!room) {
    return {
      success: false,
      reason: "Room not found.",
    };
  }

  if (room.status !== "waiting") {
    return {
      success: false,
      reason: "Game has already started.",
    };
  }

  if (!userId || !name?.trim()) {
    return {
      success: false,
      reason: "User ID and name are required.",
    };
  }

  const alreadyJoined = room.players.some(
    (player) => player.userId === userId
  );

  if (alreadyJoined) {
    return {
      success: false,
      reason: "Player is already in the room.",
    };
  }

  if (room.players.length >= room.maxPlayers) {
    return {
      success: false,
      reason: "Room is full.",
    };
  }

  // Server decides the player's color.
  const assignedColor =
    getNextAvailableColor({
      maxPlayers: room.maxPlayers,
      players: room.players,
    });

  if (!assignedColor) {
    return {
      success: false,
      reason: "No player color is available.",
    };
  }

  const player = {
    userId,
    name: name.trim(),
    color: assignedColor,
    isHost: false,
    isConnected: true,
    avatar: avatar || null,
  };

  room.players.push(player);

  return {
    success: true,
    room,
  };
};


// ----------------------------------------------------------
// Leave Room
// ----------------------------------------------------------

export const leaveRoom = ({
  roomId,
  userId,
}) => {

  const room = rooms.get(roomId);

  if (!room) {
    return {
      success: false,
      reason: "Room not found.",
    };
  }

  const playerIndex = room.players.findIndex(
    (player) => player.userId === userId
  );

  if (playerIndex === -1) {
    return {
      success: false,
      reason: "Player is not in the room.",
    };
  }

  const leavingPlayer =
    room.players[playerIndex];

  room.players.splice(playerIndex, 1);


  // --------------------------------------------------------
  // Delete room when no players remain
  // --------------------------------------------------------

  if (room.players.length === 0) {
    rooms.delete(roomId);

    return {
      success: true,
      room: null,
      deleted: true,
    };
  }


  // --------------------------------------------------------
  // Assign new host if current host leaves
  // --------------------------------------------------------

  if (leavingPlayer.isHost) {

    const newHost = room.players[0];

    newHost.isHost = true;

    room.hostId = newHost.userId;
  }


  return {
    success: true,
    room,
    deleted: false,
  };
};


// ----------------------------------------------------------
// Check Whether Game Can Start
// ----------------------------------------------------------

export const canStartGame = ({
  roomId,
}) => {

  const room = rooms.get(roomId);

  if (!room) {
    return {
      canStart: false,
      reason: "Room not found.",
    };
  }

  if (room.status !== "waiting") {
    return {
      canStart: false,
      reason: "Game has already started.",
    };
  }

  // Exact number selected when room was created.
  if (room.players.length < room.maxPlayers) {
    return {
      canStart: false,
      reason: `All ${room.maxPlayers} players are required to start the game.`,
    };
  }

  return {
    canStart: true,
    reason: null,
  };
};


// ----------------------------------------------------------
// Start Game
// ----------------------------------------------------------

export const startGame = ({
  roomId,
  userId,
}) => {

  const room = rooms.get(roomId);

  if (!room) {
    return {
      success: false,
      reason: "Room not found.",
    };
  }


  // --------------------------------------------------------
  // Only host can start
  // --------------------------------------------------------

  if (room.hostId !== userId) {
    return {
      success: false,
      reason: "Only the host can start the game.",
    };
  }


  // --------------------------------------------------------
  // Check whether game can start
  // --------------------------------------------------------

  const startCheck = canStartGame({
    roomId,
  });

  if (!startCheck.canStart) {
    return {
      success: false,
      reason: startCheck.reason,
    };
  }


  // --------------------------------------------------------
  // Prepare players for game engine
  // --------------------------------------------------------

  const gamePlayers = room.players.map(
    (player) => ({
      userId: player.userId,
      name: player.name,
      color: player.color,
      isBot: player.isBot || false,
    })
  );


  // --------------------------------------------------------
  // Create game engine state
  // --------------------------------------------------------

  const game = createInitialGameState({
    playerCount: room.maxPlayers,
    players: gamePlayers,
  });

  game.roomId = room.roomId;
  room.status = "playing";
  room.game = game;


  return {
    success: true,
    room,
  };
};

// ----------------------------------------------------------
// Bot Room Management
// ----------------------------------------------------------

const BOT_NAMES = [
  "NinjaBot",
  "ShadowBot",
  "RogueAI",
  "CyberPawn",
  "GhostBot",
  "ViperAI",
  "TitanBot",
  "ZenBot",
];

export const addBotToRoom = ({ roomId, hostId }) => {
  const room = rooms.get(roomId);
  if (!room) {
    return { success: false, reason: "Room not found." };
  }
  if (room.status !== "waiting") {
    return { success: false, reason: "Game has already started." };
  }
  if (room.hostId !== hostId) {
    return { success: false, reason: "Only the host can add bots." };
  }
  if (room.players.length >= room.maxPlayers) {
    return { success: false, reason: "Room is full." };
  }

  const assignedColor = getNextAvailableColor({
    maxPlayers: room.maxPlayers,
    players: room.players,
  });

  if (!assignedColor) {
    return { success: false, reason: "No player color is available." };
  }

  const usedNames = new Set(room.players.map((p) => p.name));
  const botName =
    BOT_NAMES.find((n) => !usedNames.has(n)) || `Bot ${room.players.length + 1}`;
  const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const bot = {
    userId: botId,
    name: botName,
    color: assignedColor,
    isHost: false,
    isConnected: true,
    isBot: true,
  };

  room.players.push(bot);

  return { success: true, room, bot };
};

export const fillRoomWithBots = ({ roomId, hostId }) => {
  const room = rooms.get(roomId);
  if (!room) {
    return { success: false, reason: "Room not found." };
  }
  if (room.status !== "waiting") {
    return { success: false, reason: "Game has already started." };
  }
  if (room.hostId !== hostId) {
    return { success: false, reason: "Only the host can fill room with bots." };
  }

  const addedBots = [];
  while (room.players.length < room.maxPlayers) {
    const res = addBotToRoom({ roomId, hostId });
    if (!res.success) break;
    addedBots.push(res.bot);
  }

  return { success: true, room, addedBots };
};

export const removeBotFromRoom = ({ roomId, hostId, botId }) => {
  const room = rooms.get(roomId);
  if (!room) {
    return { success: false, reason: "Room not found." };
  }
  if (room.status !== "waiting") {
    return { success: false, reason: "Game has already started." };
  }
  if (room.hostId !== hostId) {
    return { success: false, reason: "Only the host can remove bots." };
  }

  const botIndex = room.players.findIndex(
    (p) => p.userId === botId && p.isBot === true
  );

  if (botIndex === -1) {
    return { success: false, reason: "Bot not found in room." };
  }

  room.players.splice(botIndex, 1);

  return { success: true, room };
};

// ----------------------------------------------------------
// Get All Rooms
// ----------------------------------------------------------

export const getRooms = () => {
  return Array.from(rooms.values());
};


// ----------------------------------------------------------
// Clear Rooms
// Useful for tests
// ----------------------------------------------------------

export const clearRooms = () => {
  rooms.clear();
};

export const deleteRoom = ({ roomId }) => {
  return rooms.delete(roomId);
};