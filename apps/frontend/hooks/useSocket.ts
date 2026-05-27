import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/useAuthStore";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    // Only connect if we have a valid token
    if (!token) return;

    // Initialize the socket and pass the token exactly how the backend expects it
    socketRef.current = io(BACKEND_URL, {
      auth: { token },
      transports: ["websocket", "polling"], // Fallback to polling if websocket fails
    });

    socketRef.current.on("connect", () => {
      console.log(`🔌 Connected to WebSocket with ID: ${socketRef.current?.id}`);
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("Socket Connection Error:", err.message);
    });

    // Cleanup function: Disconnect when component unmounts or token changes
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token]);

  return socketRef.current;
};