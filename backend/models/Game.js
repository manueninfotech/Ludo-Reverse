import mongoose from "mongoose";

// =========================
// Coin Schema
// =========================

const coinSchema = new mongoose.Schema(
  {
    coinId: {
      type: String,
      required: true,
    },

    area: {
      type: String,
      enum: ["base", "main", "home", "finished"],
      default: "base",
    },

    // Player-relative progress
    // -1  = base
    // 0-51 = main board
    // 52-56 = home path
    // 57 = finished
    progress: {
      type: Number,
      default: -1,
    },

    // Actual cell on the shared main track.
    // null when coin is in base, home or finished.
    absoluteCell: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

// =========================
// Player Schema
// =========================

const playerSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    color: {
      type: String,
      enum: [
        "red",
        "green",
        "yellow",
        "blue",
        "orange",
        "purple",
        "pink",
        "cyan",
      ],
      required: true,
    },

    // Player's starting cell on the main board
    startCell: {
      type: Number,
      required: true,
    },

    coins: {
      type: [coinSchema],
      validate: {
        validator: (coins) => coins.length === 4,
        message: "Each player must have exactly 4 coins.",
      },
    },

    isReady: {
      type: Boolean,
      default: false,
    },

    isConnected: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

// =========================
// Turn Schema
// =========================

const turnSchema = new mongoose.Schema(
  {
    playerId: {
      type: String,
      default: null,
    },

    diceValue: {
      type: Number,
      min: 1,
      max: 6,
      default: null,
    },

    hasRolled: {
      type: Boolean,
      default: false,
    },

    // Backward movement is available
    // only on a normal turn.
    backwardAllowed: {
      type: Boolean,
      default: true,
    },

    extraTurn: {
      type: Boolean,
      default: false,
    },

    extraTurnReason: {
      type: String,
      enum: ["six", "kill", "finish", null],
      default: null,
    },

    turnStartedAt: {
      type: Date,
      default: null,
    },

    turnExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

// =========================
// Game Schema
// =========================

const gameSchema = new mongoose.Schema(
  {
    // =========================
    // Game Status
    // =========================

    status: {
      type: String,
      enum: ["waiting", "playing", "finished", "cancelled"],
      default: "waiting",
    },

    // =========================
    // Number of Players
    // =========================

    maxPlayers: {
      type: Number,
      enum: [2, 3, 4, 5, 6],
      required: true,
    },

    // =========================
    // Board Type
    // =========================

    boardType: {
      type: String,
      enum: ["standard-4", "five-player", "six-player"],
      required: true,
    },

    // =========================
    // Players
    // =========================

    players: {
      type: [playerSchema],
      default: [],
      validate: {
        validator: function (players) {
          return players.length <= this.maxPlayers;
        },
        message: "Number of players cannot exceed the selected game size.",
      },
    },

    // =========================
    // Current Turn
    // =========================

    currentTurn: {
      type: turnSchema,
      default: () => ({}),
    },

    // =========================
    // Winner
    // =========================

    winnerId: {
      type: String,
      default: null,
    },

    // =========================
    // Move Counter
    // =========================

    moveCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Game = mongoose.model("Game", gameSchema);

export default Game;