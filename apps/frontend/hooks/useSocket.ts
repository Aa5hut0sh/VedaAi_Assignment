import { useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/useAuthStore";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export const useSocket = () => {
  const token = useAuthStore((state) => state.token);

  const socket = useMemo<Socket | null>(() => {
    if (!token) return null;

    const connection = io(BACKEND_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    connection.on("connect", () => {
      console.log(`Connected to WebSocket with ID: ${connection.id}`);
    });

    connection.on("connect_error", (err) => {
      console.error("Socket Connection Error:", err.message);
    });

    return connection;
  }, [token]);

  useEffect(() => {
    return () => {
      socket?.disconnect();
    };
  }, [socket]);

  return socket;
};
