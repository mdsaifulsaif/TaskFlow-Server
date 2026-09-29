import { config } from "./config";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import { initDB } from "./config/db";
import { initAttendanceCron } from "./cron/attendanceCron";

const PORT = config.port || 5001;

// 1. HTTP Server
const httpServer = createServer(app);

// 2. Allowed origins for CORS
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
];

// 3. Socket.IO Server configuration
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// 4. Set io instance in express app
app.set("io", io);

// 5. Socket connection lifecycle
io.on("connection", (socket) => {
  console.log(`🔌 Success: A user connected to Socket! ID: ${socket.id}`);

  socket.on("disconnect", (reason) => {
    console.log(`🔌 User disconnected from Socket (ID: ${socket.id}, reason: ${reason})`);
  });
});

// 6. Initialize Database and start server
initDB().then(() => {
  httpServer.listen(PORT, () => {
    initAttendanceCron();
    console.log(`🚀 Server running on port ${PORT}`);
  });
});