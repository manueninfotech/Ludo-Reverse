import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import { registerRoomSocket } from "./sockets/roomSocket.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000 ;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Reverse Ludo Backend is running",
  });
});

// Socket connection
io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);
  registerRoomSocket(io, socket);
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});