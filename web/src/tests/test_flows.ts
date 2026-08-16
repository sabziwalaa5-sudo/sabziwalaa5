/**
 * SABJIWALAA ५ — Automated Verification Suite
 * Tests all core business logic, input validation, rate limiting, and security engines.
 * Execute using: npx tsx src/tests/test_flows.ts
 */

import {
  validateEmail,
  validatePhone,
  validateAmount,
  validateCouponCode,
  validateAddress,
  validateCoordinates,
  validateOrder
} from "../lib/validation";

import { checkRateLimit, resetRateLimit } from "../lib/rateLimiter";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${message}`);
  } else {
    console.error(`❌ [FAIL] ${message}`);
  }
}

console.log("🚀 Starting SABJIWALAA ५ Core Verification Suite...\n");

// ─────────────────────────────────────────────────────────
// Test 1: Email Validation & Sanitization
// ─────────────────────────────────────────────────────────
console.log("--- Testing Email Validation ---");
assert(validateEmail("sabziwalaa5@gmail.com").valid === true, "Valid admin email passes");
assert(validateEmail("raman@gmail.com").valid === true, "Valid vendor email passes");
assert(validateEmail("customer.test+label@domain.co.in").valid === true, "Complex valid email passes");
assert(validateEmail("invalid-email").valid === false, "Email without @ fails");
assert(validateEmail("test@").valid === false, "Email without domain fails");
assert(validateEmail("test@domain").valid === false, "Email with incomplete TLD fails");
assert(
  validateEmail("<script>alert('xss')</script>@gmail.com").sanitized === "alert('xss')@gmail.com",
  "HTML script tags are sanitized from email input"
);

// ─────────────────────────────────────────────────────────
// Test 2: Phone Number Validation
// ─────────────────────────────────────────────────────────
console.log("\n--- Testing Phone Number Validation ---");
assert(validatePhone("9876543210").valid === true, "Valid 10-digit Indian phone passes");
assert(validatePhone("7012345678").valid === true, "Valid starting with 7 passes");
assert(validatePhone("5999999999").valid === false, "Indian phone starting with 5 fails");
assert(validatePhone("123456789").valid === false, "Phone with less than 10 digits fails");
assert(validatePhone("98765432101").valid === false, "Phone with more than 10 digits fails");

// ─────────────────────────────────────────────────────────
// Test 3: Amount & Price Calculations
// ─────────────────────────────────────────────────────────
console.log("\n--- Testing Amount & Currency Calculations ---");
assert(validateAmount(45.5).valid === true, "Positive amount is valid");
assert(validateAmount(-10).valid === false, "Negative amount is invalid");
assert(validateAmount(0, 5).valid === false, "Amount below min is invalid");
assert(validateAmount(25000, 0, 10000).valid === false, "Amount above max is invalid");
assert(validateAmount(10.555).value === 10.56, "Amount correctly rounded to 2 decimal places");

// ─────────────────────────────────────────────────────────
// Test 4: Coupon Codes Sanitization & Validation
// ─────────────────────────────────────────────────────────
console.log("\n--- Testing Coupon Code Rules ---");
assert(validateCouponCode("fresh20").sanitized === "FRESH20", "Lowercase coupon auto-converted to uppercase");
assert(validateCouponCode("FLAT50").valid === true, "Valid alphanumeric coupon passes");
assert(validateCouponCode("AB").valid === false, "Coupon under 3 chars fails");
assert(validateCouponCode("A".repeat(21)).valid === false, "Coupon over 20 chars fails");

// ─────────────────────────────────────────────────────────
// Test 5: Location Coordinate Safety
// ─────────────────────────────────────────────────────────
console.log("\n--- Testing Geographic Coordinates Safety ---");
assert(validateCoordinates(28.5305, 77.1048).valid === true, "Valid coordinates in Delhi pass");
assert(validateCoordinates(95, 77.1048).valid === false, "Latitude above 90 fails");
assert(validateCoordinates(28.5305, -185).valid === false, "Longitude below -180 fails");

// ─────────────────────────────────────────────────────────
// Test 6: Rate Limiting sliding window protection
// ─────────────────────────────────────────────────────────
console.log("\n--- Testing Rate Limiting Protections ---");
const testUser = "tester@gmail.com";
resetRateLimit(`placeOrder:${testUser}`);

// Allowed up to 3 attempts per window
assert(checkRateLimit(`placeOrder:${testUser}`, 3, 5000).allowed === true, "Attempt 1 allowed");
assert(checkRateLimit(`placeOrder:${testUser}`, 3, 5000).allowed === true, "Attempt 2 allowed");
assert(checkRateLimit(`placeOrder:${testUser}`, 3, 5000).allowed === true, "Attempt 3 allowed");
assert(checkRateLimit(`placeOrder:${testUser}`, 3, 5000).allowed === false, "Attempt 4 blocked by rate-limit");

// ─────────────────────────────────────────────────────────
// Test 7: Order Validation Logic
// ─────────────────────────────────────────────────────────
console.log("\n--- Testing Order Schema & Business Logic ---");
const validOrder = {
  items: [{ productId: "p1", name: "Premium Organic Potatoes", qty: 2, price: 40 }],
  deliveryAddress: "Rajokri Crossroad, New Delhi",
  paymentMethod: "Cash on Delivery",
  totalAmount: 80
};
assert(validateOrder(validOrder).valid === true, "Complete valid order passes validation");

const emptyOrder = {
  items: [],
  deliveryAddress: "Rajokri Crossroad, New Delhi",
  paymentMethod: "Cash on Delivery",
  totalAmount: 0
};
assert(validateOrder(emptyOrder).valid === false, "Order with empty cart fails");

const invalidPaymentOrder = {
  ...validOrder,
  paymentMethod: "Bitcoin"
};
assert(validateOrder(invalidPaymentOrder).valid === false, "Order with invalid payment method fails");

console.log(`\n─────────────────────────────────────────────────────────`);
console.log(`📊 Verification Complete: ${passedTests}/${totalTests} checks passed.`);
if (passedTests === totalTests) {
  console.log("⭐️ ALL CORE SYSTEM TESTS PASSED SUCCESSFULLY! ⭐️\n");
  process.exit(0);
} else {
  console.error("⚠️ SOME CHECKS FAILED. Please review output above.\n");
  process.exit(1);
}
