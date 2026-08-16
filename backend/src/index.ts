import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { setupSockets } from "./socket";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Basic sanity check route
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date() });
});

// Mock database for zero-config fallback
let mockDb = {
  vendors: [
    { id: "v1", storeName: "Akshay Farms Organic", latitude: 28.6304, longitude: 77.2177, isActive: true },
    { id: "v2", storeName: "Delhi Fresh Veggies", latitude: 28.6432, longitude: 77.2111, isActive: true },
    { id: "v3", storeName: "Noida Organic Hub", latitude: 28.6250, longitude: 77.3735, isActive: true }
  ],
  orders: [] as any[]
};

// Route to query nearest vendors (simulates Haversine SQL query)
app.post("/api/vendors/nearest", (req, res) => {
  const { latitude, longitude } = req.body;
  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Latitude and longitude required" });
  }

  // Haversine calculation in JS for demonstration/fallback
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const nearby = mockDb.vendors
    .map(v => ({
      ...v,
      distanceKm: Number(getDistance(latitude, longitude, v.latitude, v.longitude).toFixed(2))
    }))
    .filter(v => v.distanceKm <= 5.0)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json(nearby);
});

const server = http.createServer(app);
const io = setupSockets(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[Sabjiwala 5 Backend] Running on http://localhost:${PORT}`);
});
