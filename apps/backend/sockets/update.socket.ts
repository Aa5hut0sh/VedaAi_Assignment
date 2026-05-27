import { Server, Socket } from "socket.io";

export const updateSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(
      `Client connected: ${socket.data.userId} with role: ${socket.data.role} for socket ${socket.id}`,
    );

    socket.on("join-assignment", (assignmentId: string) => {
      socket.join(assignmentId);
      console.log(
        ` Socket ${socket.id} joined assignment room: ${assignmentId}`,
      );
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};
