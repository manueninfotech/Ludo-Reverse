import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import { registerRoomSocket } from "./sockets/index.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import dailyRewardRoutes from "./routes/dailyRewardRoutes.js";
import { socketAuthMiddleware } from "./middleware/socketAuthMiddleware.js";

import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";

dotenv.config();

connectDB();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// --------------------------------------------------------
// CORS Configuration
// Whitelist specific web origins; allow mobile apps (no Origin header)
// --------------------------------------------------------

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
    ];

const corsOriginHandler = (origin, callback) => {
  // Allow mobile apps, native clients, and curl (no Origin header)
  if (!origin || allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  return callback(new Error("Blocked by CORS policy"));
};

const corsOptions = {
  origin: corsOriginHandler,
  credentials: true,
};

// --------------------------------------------------------
// Rate Limiting
// --------------------------------------------------------

// Global API rate limiter: 250 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// General auth route limiter (for token refresh, session checks, etc.): 60 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication requests. Please try again after 15 minutes.",
  },
});

// --------------------------------------------------------
// Security Middleware
// --------------------------------------------------------

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "200kb" }));
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  next();
});

// --------------------------------------------------------
// REST API Routes
// --------------------------------------------------------

app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use(
  "/api/daily-rewards",
  dailyRewardRoutes
);

// --------------------------------------------------------
// Test Route
// --------------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Reverse Ludo Backend is running",
  });
});

// --------------------------------------------------------
// Socket.IO
// --------------------------------------------------------

const io = new Server(server, {
  cors: {
    origin: corsOriginHandler,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// --------------------------------------------------------
// Socket Authentication
// IMPORTANT: middleware must be registered BEFORE
// the connection handler.
// --------------------------------------------------------

io.use(socketAuthMiddleware);

// --------------------------------------------------------
// Socket Connection
// --------------------------------------------------------

io.on("connection", (socket) => {
  console.log(
    "Player connected:",
    socket.id,
    "User:",
    socket.data.userId
  );

  registerRoomSocket(io, socket);
});

// --------------------------------------------------------
// Start Server
// --------------------------------------------------------

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});