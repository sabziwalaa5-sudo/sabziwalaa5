# SABJIWALA 5 - System Architecture & Scalability Design

This document details the production-ready system architecture designed to scale to **100,000+ active users** with sub-second response times and high availability.

---

## 1. Global Scaling Pattern

To support 100k+ users and millions of location updates, the platform separates the **Stateful real-time tracking network** from the **Stateless transaction API routes**:

```
[Clients: Web & Mobile]
        │
        ├──► [Cloudflare CDN / DNS]
        │          │
        │          ├──► [Load Balancer / API Gateway]
        │          │          ├──► [Stateless ECS Service Cluster] (Auth, Products, Cart)
        │          │          └──► [Database Replica Pool]
        │          │
        │          └──► [WebSocket Load Balancer] (sticky sessions)
        │                     └──► [Socket.IO Server Instances] (Redis Pub/Sub adapter)
```

### High Scale Geolocation Matching
1. **PostgreSQL + PostGIS**: Geolocation coordinates are stored using geography type. A spatial index (`GIST`) is established on the coordinates.
2. **Haversine Queries**: For high throughput, coordinate lookups are cached in Redis using `GEORADIUS` to identify near active stores before executing write transactions on Postgres.
3. **Cascading Order Dispatch Queue**: When an order is placed:
   - Client coords are matched to active vendors in a 5 KM radius.
   - The nearest vendor is selected.
   - An ephemeral transaction lock is placed.
   - If the vendor rejects or fails to respond within 30 seconds, an asynchronous event via **RabbitMQ/Redis Queue** pops the next nearest vendor and dispatches the task.

---

## 2. WebSockets & Live Tracking (Socket.IO)

* **Clustering**: A cluster of Socket.IO servers is backed by a **Redis Pub/Sub Adapter**. This allows a driver connected to Instance A to push coordinates to a client connected to Instance B seamlessly.
* **Frequency Throttle**: Delivery driver mobile clients send GPS packets restricted to a maximum rate of **once every 3 seconds** to prevent battery drain and API gateway congestion.
* **Payload Size**: Location updates are kept small (only JSON coordinates and order reference id) to minimize network ingress costs.

---

## 3. Database Layer

* **Supabase / PostgreSQL Instance**: Multi-AZ RDS deployment.
* **Connection Pooler**: Managed with **PgBouncer** to handle thousands of concurrent queries.
* **Read Replicas**: All read operations (browsing catalog, loading reviews) are directed to read replicas. Writes (placing orders, vendor status shifts) run on the primary master database.
