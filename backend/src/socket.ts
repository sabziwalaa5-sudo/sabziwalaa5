import { Server } from "socket.io";
import http from "http";
import { getAllowedOrigins } from "./security";

export function setupSockets(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Socket.IO] Client connected: ${socket.id}`);
    }

    // Join room for specific order tracking
    socket.on("join_order_room", (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on("update_driver_location", (data: { orderId: string; latitude: number; longitude: number }) => {
      const { orderId, latitude, longitude } = data;
      io.to(`order:${orderId}`).emit("driver_location_changed", {
        latitude,
        longitude,
        updatedAt: new Date().toISOString()
      });
    });

    // Order status changes broadcast
    socket.on("change_order_status", (data: { orderId: string; status: string }) => {
      const { orderId, status } = data;
      io.to(`order:${orderId}`).emit("order_status_updated", {
        status,
        updatedAt: new Date().toISOString()
      });
    });

    socket.on("disconnect", () => {
      // no-op in production
    });
  });

  return io;
}
