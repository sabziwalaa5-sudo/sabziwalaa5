import { Request, Response } from "express";

interface GeoPoint {
  latitude: number;
  longitude: number;
}

// Haversine calculation to verify proximity
function getDistanceKm(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371; // Earth radius in KM
  const dLat = (p2.latitude - p1.latitude) * Math.PI / 180;
  const dLon = (p2.longitude - p1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(p1.latitude * Math.PI / 180) * Math.cos(p2.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export class OrderController {
  /**
   * 1. Customer places order.
   * 2. Detect customer location.
   * 3. Find nearest vendors within 5 KM.
   * 4. Check inventory availability.
   * 5. Dispatch order request.
   */
  static async createOrder(req: Request, res: Response) {
    try {
      const { customerId, items, deliveryAddress, latitude, longitude, paymentMethod } = req.body;

      if (!latitude || !longitude || !items || items.length === 0) {
        return res.status(400).json({ error: "Missing required order parameters." });
      }

      // Mock database query for active vendors inside 5 KM
      const allVendors = [
        { id: "v-01", storeName: "Organic Vegetable Store - Akshay", latitude: 28.6304, longitude: 77.2177, isOnline: true },
        { id: "v-02", storeName: "Fresh Farms Subzi - CP", latitude: 28.6280, longitude: 77.2201, isOnline: true },
        { id: "v-03", storeName: "Noida Sector 62 Hub", latitude: 28.6250, longitude: 77.3735, isOnline: true }
      ];

      const customerLocation = { latitude, longitude };
      
      // Calculate distances and filter by 5 KM
      const candidateVendors = allVendors
        .map(vendor => ({
          ...vendor,
          distanceKm: getDistanceKm(customerLocation, { latitude: vendor.latitude, longitude: vendor.longitude })
        }))
        .filter(vendor => vendor.distanceKm <= 5.0)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      if (candidateVendors.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No organic vendors found within a 5 KM radius of your location."
        });
      }

      // Select the nearest candidate vendor
      const selectedVendor = candidateVendors[0];

      // Simulate creation of order record
      const newOrder = {
        id: `ord-${Math.floor(100000 + Math.random() * 900000)}`,
        customerId,
        vendorId: selectedVendor.id,
        vendorName: selectedVendor.storeName,
        deliveryAddress,
        latitude,
        longitude,
        distanceKm: selectedVendor.distanceKm,
        items,
        totalAmount: items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0),
        status: "PLACED",
        paymentMethod,
        paymentStatus: paymentMethod === "COD" ? "PENDING" : "PAID",
        createdAt: new Date().toISOString()
      };

      return res.status(201).json({
        success: true,
        message: "Order placed successfully. Forwarding request to nearest vendor...",
        order: newOrder
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Handles order acceptance/rejection by the vendor.
   * If rejected, cascades to the next nearest vendor.
   */
  static async handleVendorResponse(req: Request, res: Response) {
    const { orderId, vendorId, accepted } = req.body;

    if (accepted) {
      return res.json({
        success: true,
        status: "ACCEPTED",
        message: "Order accepted by vendor. Assigning nearest delivery partner..."
      });
    } else {
      // Simulate cascading to the next nearest vendor
      return res.json({
        success: true,
        status: "RE-ROUTED",
        message: "Order rejected by initial vendor. Cascade triggered to next nearest vendor within 5 KM."
      });
    }
  }
}
