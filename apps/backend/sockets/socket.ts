import { Server } from "socket.io";
import http from "http";
import { socketAuthMiddleware } from "../middlewares/socketAuth.middleware";
import { updateSocket } from "./update.socket";

let io: Server;

export const initSockets = (server: http.Server) => {
    io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

    updateSocket(io);

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
    return io;
};