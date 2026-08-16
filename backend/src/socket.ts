import { Server } from "socket.io";
import http from "http";

export function setupSockets(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join room for specific order tracking
    socket.on("join_order_room", (orderId: string) => {
      socket.join(`order:${orderId}`);
      console.log(`[Socket.IO] Client ${socket.id} joined room: order:${orderId}`);
    });

    // Update driver coordinates
    socket.on("update_driver_location", (data: { orderId: string; latitude: number; longitude: number }) => {
      const { orderId, latitude, longitude } = data;
      console.log(`[Socket.IO] Location update for Order ${orderId}: ${latitude}, ${longitude}`);
      
      // Broadcast coordinates to all clients in the order room (customer, vendor, admin)
      io.to(`order:${orderId}`).emit("driver_location_changed", {
        latitude,
        longitude,
        updatedAt: new Date().toISOString()
      });
    });

    // Order status changes broadcast
    socket.on("change_order_status", (data: { orderId: string; status: string }) => {
      const { orderId, status } = data;
      console.log(`[Socket.IO] Order ${orderId} changed status to: ${status}`);
      io.to(`order:${orderId}`).emit("order_status_updated", {
        status,
        updatedAt: new Date().toISOString()
      });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}
