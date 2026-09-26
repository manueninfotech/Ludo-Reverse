import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import { registerRoomSocket } from "./sockets/roomSocket.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import dailyRewardRoutes from "./routes/dailyRewardRoutes.js";
import { socketAuthMiddleware } from "./middleware/socketAuthMiddleware.js";

dotenv.config();

connectDB();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// --------------------------------------------------------
// Express Middleware
// --------------------------------------------------------

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// --------------------------------------------------------
// REST API Routes
// --------------------------------------------------------

app.use("/api/auth", authRoutes);
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
    origin: "http://localhost:5173",
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