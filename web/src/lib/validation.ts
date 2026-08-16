/**
 * SABJIWALAA ५ — Input Validation & Sanitization Module
 * Uses Zod for schema-based validation across all user inputs
 */

// Lightweight inline validation (no external Zod dependency needed for client-side)
// This module provides sanitization + validation for all critical user inputs

// ─────────────────────────────────────────────────────────
// Sanitization Helpers
// ─────────────────────────────────────────────────────────

/** Strip HTML tags and script injection vectors */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")           // Strip HTML tags
    .replace(/javascript:/gi, "")       // Block JS URI scheme
    .replace(/on\w+=/gi, "")            // Strip event handlers
    .replace(/data:/gi, "")             // Block data URIs
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** Sanitize and limit length */
export function sanitizeInput(input: string, maxLength: number = 500): string {
  return sanitizeString(input).slice(0, maxLength);
}

// ─────────────────────────────────────────────────────────
// Email Validation
// ─────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateEmail(email: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeInput(email, 254);
  if (!sanitized) return { valid: false, sanitized, error: "Email is required" };
  if (!EMAIL_REGEX.test(sanitized)) return { valid: false, sanitized, error: "Invalid email format" };
  return { valid: true, sanitized };
}

// ─────────────────────────────────────────────────────────
// Phone Number Validation (Indian format)
// ─────────────────────────────────────────────────────────

const PHONE_REGEX = /^[6-9]\d{9}$/;

export function validatePhone(phone: string): { valid: boolean; sanitized: string; error?: string } {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length !== 10) return { valid: false, sanitized: digits, error: "Phone number must be exactly 10 digits" };
  if (!PHONE_REGEX.test(digits)) return { valid: false, sanitized: digits, error: "Invalid Indian mobile number" };
  return { valid: true, sanitized: digits };
}

// ─────────────────────────────────────────────────────────
// Price / Amount Validation
// ─────────────────────────────────────────────────────────

export function validateAmount(amount: number, min: number = 0, max: number = 100000): { valid: boolean; value: number; error?: string } {
  if (typeof amount !== "number" || isNaN(amount)) return { valid: false, value: 0, error: "Invalid amount" };
  if (amount < min) return { valid: false, value: amount, error: `Amount must be at least ₹${min}` };
  if (amount > max) return { valid: false, value: amount, error: `Amount exceeds maximum ₹${max}` };
  return { valid: true, value: Math.round(amount * 100) / 100 };
}

// ─────────────────────────────────────────────────────────
// Coupon Code Validation
// ─────────────────────────────────────────────────────────

const COUPON_REGEX = /^[A-Z0-9]{3,20}$/;

export function validateCouponCode(code: string): { valid: boolean; sanitized: string; error?: string } {
  const upper = code.toUpperCase().trim();
  if (upper.length < 3 || upper.length > 20) return { valid: false, sanitized: upper, error: "Coupon must be between 3 and 20 characters" };
  const sanitized = upper.replace(/[^A-Z0-9]/g, "");
  if (!COUPON_REGEX.test(sanitized)) return { valid: false, sanitized, error: "Coupon must be 3-20 alphanumeric characters" };
  return { valid: true, sanitized };
}

// ─────────────────────────────────────────────────────────
// Search Query Validation
// ─────────────────────────────────────────────────────────

export function validateSearchQuery(query: string): { valid: boolean; sanitized: string } {
  const sanitized = sanitizeInput(query, 100);
  return { valid: sanitized.length >= 0, sanitized };
}

// ─────────────────────────────────────────────────────────
// Address Validation
// ─────────────────────────────────────────────────────────

export function validateAddress(address: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeInput(address, 300);
  if (!sanitized || sanitized.length < 10) return { valid: false, sanitized, error: "Address must be at least 10 characters" };
  return { valid: true, sanitized };
}

// ─────────────────────────────────────────────────────────
// Coordinate Validation (Lat/Lng)
// ─────────────────────────────────────────────────────────

export function validateCoordinates(lat: number, lng: number): { valid: boolean; error?: string } {
  if (typeof lat !== "number" || typeof lng !== "number") return { valid: false, error: "Invalid coordinates" };
  if (lat < -90 || lat > 90) return { valid: false, error: "Latitude must be between -90 and 90" };
  if (lng < -180 || lng > 180) return { valid: false, error: "Longitude must be between -180 and 180" };
  return { valid: true };
}

// ─────────────────────────────────────────────────────────
// Order Validation
// ─────────────────────────────────────────────────────────

export interface OrderValidation {
  valid: boolean;
  errors: string[];
}

export function validateOrder(order: {
  items: any[];
  deliveryAddress: string;
  paymentMethod: string;
  totalAmount: number;
}): OrderValidation {
  const errors: string[] = [];

  if (!order.items || order.items.length === 0) {
    errors.push("Cart is empty");
  }

  if (!order.deliveryAddress || order.deliveryAddress.length < 5) {
    errors.push("Valid delivery address is required");
  }

  const validPaymentMethods = ["Cash on Delivery", "UPI", "Card Payment"];
  if (!validPaymentMethods.includes(order.paymentMethod)) {
    errors.push("Invalid payment method");
  }

  const amountCheck = validateAmount(order.totalAmount, 1);
  if (!amountCheck.valid) {
    errors.push(amountCheck.error || "Invalid total amount");
  }

  // Verify each item has valid quantity and price
  for (const item of order.items || []) {
    if (!item.qty || item.qty < 1 || item.qty > 99) {
      errors.push(`Invalid quantity for ${item.name || "unknown item"}`);
    }
    if (!item.price || item.price <= 0) {
      errors.push(`Invalid price for ${item.name || "unknown item"}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
