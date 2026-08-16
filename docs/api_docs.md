# SABJIWALA 5 - REST API Endpoints Specification

This document details the REST API endpoints exposed by the Node.js / Express gateway backend.

---

## 1. Authentication Portal

### POST `/api/auth/otp/send`
Requests a 6-digit OTP code to be sent to a user's mobile number.
* **Request Body**:
  ```json
  {
    "phone": "9999888877"
  }
  ```
* **Response (Success)**:
  ```json
  {
    "success": true,
    "message": "OTP verification code dispatched."
  }
  ```

### POST `/api/auth/otp/verify`
Validates the OTP code and returns a JSON Web Token (JWT) + user roles.
* **Request Body**:
  ```json
  {
    "phone": "9999888877",
    "code": "123456"
  }
  ```
* **Response (Success)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "u-9821039",
      "phone": "9999888877",
      "role": "VENDOR"
    }
  }
  ```

---

## 2. Hyperlocal Marketplace Catalog

### POST `/api/vendors/nearest`
Locates active stores operating within 5 KM of the provided GPS coordinates.
* **Request Body**:
  ```json
  {
    "latitude": 28.6304,
    "longitude": 77.2177
  }
  ```
* **Response**:
  ```json
  [
    {
      "id": "v-01",
      "storeName": "Organic Vegetable Store - Akshay",
      "distanceKm": 0.8,
      "latitude": 28.6304,
      "longitude": 77.2177,
      "isOnline": true
    }
  ]
  ```

---

## 3. Order Management

### POST `/api/orders`
Creates a hyperlocal order and dispatches it to the nearest vendor.
* **Request Body**:
  ```json
  {
    "customerId": "cust-92",
    "items": [
      { "productId": "p1", "quantity": 2, "price": 40.00 }
    ],
    "deliveryAddress": "Connaught Place, New Delhi",
    "latitude": 28.6304,
    "longitude": 77.2177,
    "paymentMethod": "COD"
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "message": "Order placed successfully. Forwarding request to nearest vendor...",
    "order": {
      "id": "ORD-572910",
      "status": "PLACED",
      "totalAmount": 80.00
    }
  }
  ```

---

## 4. Payment Gateway

### POST `/api/payments/verify`
Verifies signature response tokens from the Razorpay checkout screen.
* **Request Body**:
  ```json
  {
    "razorpay_order_id": "order_HcX...",
    "razorpay_payment_id": "pay_HcX...",
    "razorpay_signature": "9a7b..."
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "paymentStatus": "PAID"
  }
  ```
