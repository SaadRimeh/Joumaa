const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { JWT_SECRET } = require("./env");

let ioInstance = null;

function extractToken(socket) {
  const authToken = socket.handshake?.auth?.token;
  const headerToken = socket.handshake?.headers?.authorization;
  const raw = authToken || headerToken;

  if (!raw || typeof raw !== "string") {
    return null;
  }

  return raw.startsWith("Bearer ") ? raw.slice(7) : raw;
}

function initSocket(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  ioInstance.use((socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  ioInstance.on("connection", (socket) => {
    if (socket.user?.role === "admin") {
      socket.join("admins");
    }

    if (socket.user?.role === "employee" && socket.user?.employeeId) {
      socket.join(`employee:${socket.user.employeeId}`);
    }

    socket.on("disconnect", () => {
      // Intentionally empty. Reserved for future presence tracking.
    });
  });

  return ioInstance;
}

function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.io is not initialized");
  }
  return ioInstance;
}

module.exports = {
  initSocket,
  getIO,
};
