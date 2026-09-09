import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { setupSockets } from "./socket";
import { OrderController } from "./controllers/order.controller";
import { lockOrderFingerprint, PaymentController } from "./controllers/payment.controller";
import { applySecurityHeaders, getAllowedOrigins, productionErrorHandler } from "./security";

dotenv.config();

const app = express();
const allowedOrigins = getAllowedOrigins();

app.disable("x-powered-by");
app.use(applySecurityHeaders);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use((req, res, next) => {
  if (req.path === "/api/payments/webhook") {
    return express.raw({ type: "application/json" })(req, res, next);
  }
  return express.json({ limit: "1mb" })(req, res, next);
});

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

const mockDb = {
  vendors: [
    { id: "v1", storeName: "Akshay Farms Organic", latitude: 28.6304, longitude: 77.2177, isActive: true },
    { id: "v2", storeName: "Delhi Fresh Veggies", latitude: 28.6432, longitude: 77.2111, isActive: true },
    { id: "v3", storeName: "Noida Organic Hub", latitude: 28.6250, longitude: 77.3735, isActive: true }
  ],
  orders: [] as any[]
};

app.post("/api/vendors/nearest", (req, res) => {
  const { latitude, longitude } = req.body;
  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Latitude and longitude required" });
  }

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
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

app.post("/api/orders", (req, res) => {
  const fingerprint = `${req.body?.customerId || ""}:${JSON.stringify(req.body?.items || [])}:${req.body?.totalAmount || req.body?.items?.length}`;
  if (!lockOrderFingerprint(fingerprint)) {
    return res.status(409).json({ error: "Duplicate order request" });
  }
  return OrderController.createOrder(req, res);
});
app.post("/api/orders/vendor-response", OrderController.handleVendorResponse);
app.post("/api/payments/create", PaymentController.create);
app.post("/api/payments/verify", PaymentController.verify);
app.post("/api/payments/webhook", PaymentController.webhook);

app.use(productionErrorHandler);

const server = http.createServer(app);
setupSockets(server);

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";
server.listen(Number(PORT), HOST, () => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Sabjiwala Backend] Listening on ${HOST}:${PORT}`);
  }
});
