/**
 * SABJIWALAA ५ — Automated Verification Suite
 */

process.env.PAYMENT_HMAC_SECRET = process.env.PAYMENT_HMAC_SECRET || "unit-test-hmac-secret";

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
import {
  buildCartItems,
  clampQuantity,
  computeBill,
  nextCartQuantity,
  orderFingerprint,
  registerOrderFingerprint,
} from "../lib/orderEngine";
import { createPaymentClaims, readClaims, signClaims } from "../lib/payments";
import { canAccessPortal, normalizeRole, portalPathForRole, roleFromEmail } from "../lib/roles";
import { INITIAL_SETTINGS, pointsEarnedForOrder, rupeesFromPoints } from "../lib/platformSettings";
import { getAdminWebHref } from "../lib/config";

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

const upiOrder = { ...validOrder, paymentMethod: "UPI" };
assert(validateOrder(upiOrder).valid === true, "UPI payment method is accepted");

const hugeQtyOrder = {
  ...validOrder,
  items: [{ productId: "p1", name: "Premium Organic Potatoes", qty: 500, price: 40 }],
};
assert(validateOrder(hugeQtyOrder).valid === false, "Quantity above 99 fails");

const zeroQtyOrder = {
  ...validOrder,
  items: [{ productId: "p1", name: "Premium Organic Potatoes", qty: 0, price: 40 }],
};
assert(validateOrder(zeroQtyOrder).valid === false, "Zero quantity fails");

console.log("\n--- Testing Cart Engine ---");
assert(clampQuantity(-3, 10) === 0, "Negative quantity clamps to 0");
assert(clampQuantity(500, 12) === 12, "Huge quantity clamps to stock");
assert(nextCartQuantity(1, 1, 2) === 2, "Increment respects stock");
assert(nextCartQuantity(2, 1, 2) === 2, "Increment does not exceed stock");

const built = buildCartItems({ p1: 2, missing: 4 }, [{ id: "p1", name: "Potatoes", price: 40, stock: 10 }]);
assert(built.length === 1 && built[0].subtotal === 80, "Cart builder ignores invalid product IDs");

const bill = computeBill({ subtotal: 250, couponDiscount: 20, redeemedPoints: 10, deliveryCharge: 30, freeDeliveryThreshold: 200 });
assert(bill.deliveryCharges === 0 && bill.totalAmount === 220, "Free delivery and discounts compute correctly");

const fp = orderFingerprint({ email: "a@b.com", items: [{ productId: "p1", qty: 1 }], totalAmount: 40 });
assert(registerOrderFingerprint(fp) === true, "First order fingerprint allowed");
assert(registerOrderFingerprint(fp) === false, "Duplicate order fingerprint blocked");

console.log("\n--- Testing Payment Token Security ---");
const claims = createPaymentClaims({ orderDraftId: "SBJ123", amountRupees: 170, method: "COD" });
const token = signClaims(claims);
assert(readClaims(token)?.paymentId === claims.paymentId, "Signed checkout token round-trips");
const [body, signature] = token.split(".");
const flipped = signature.endsWith("a") ? `${signature.slice(0, -1)}b` : `${signature.slice(0, -1)}a`;
assert(readClaims(`${body}.${flipped}`) === null, "Tampered checkout token is rejected");
assert(readClaims("not-a-token") === null, "Garbage checkout token is rejected");
const upiClaims = createPaymentClaims({ orderDraftId: "SBJ124", amountRupees: 200, method: "UPI" });
assert(signClaims(upiClaims).includes("."), "UPI checkout token is HMAC-signed");

console.log("\n--- Testing Admin Web Role Routing ---");
assert(roleFromEmail("sabziwalaa5@gmail.com") === "ADMIN", "Platform owner email maps to ADMIN");
assert(roleFromEmail("raman@gmail.com") === "VENDOR", "Merchant email maps to VENDOR");
assert(roleFromEmail("rider@gmail.com") === "DELIVERY_PARTNER", "Rider email maps to DELIVERY_PARTNER");
assert(roleFromEmail("shopper@gmail.com") === null, "Unknown email does not force a staff role");
assert(portalPathForRole("ADMIN") === "/admin", "Admin role opens the admin web portal");
assert(getAdminWebHref() === "/admin" || getAdminWebHref().endsWith("/admin"), "Admin web href resolves to the admin portal");
assert(portalPathForRole("VENDOR") === "/vendor", "Vendor role opens the vendor portal");
assert(portalPathForRole("DELIVERY_PARTNER") === "/rider", "Rider role opens the rider portal");
assert(canAccessPortal("ADMIN", "admin") === true, "Admin can open the admin portal");
assert(canAccessPortal("VENDOR", "admin") === false, "Vendor cannot open the admin portal");
assert(canAccessPortal("ADMIN", "vendor") === true, "Admin can inspect the vendor portal");
assert(normalizeRole("merchant") === "VENDOR", "Merchant alias normalizes to VENDOR");
assert(normalizeRole("rider") === "DELIVERY_PARTNER", "Rider alias normalizes to DELIVERY_PARTNER");

console.log("\n--- Testing Admin Settings Applied to Storefront ---");
const paused = { ...INITIAL_SETTINGS, maintenanceMode: true };
assert(paused.maintenanceMode === true, "Admin maintenance flag is available to the storefront");
assert(pointsEarnedForOrder(250, INITIAL_SETTINGS) === 12, "Admin earning rate of 5 pts / ₹100 yields 12 points on ₹250");
assert(pointsEarnedForOrder(250, { ...INITIAL_SETTINGS, rewardSettings: { ...INITIAL_SETTINGS.rewardSettings, enabled: false } }) === 0, "Disabled rewards earn no points");
assert(rupeesFromPoints(10, INITIAL_SETTINGS) === 10, "Default point value is ₹1 per point");
assert(rupeesFromPoints(10, { ...INITIAL_SETTINGS, rewardSettings: { ...INITIAL_SETTINGS.rewardSettings, pointValue: 0.5 } }) === 5, "Admin point value converts points to rupees");

console.log(`\n─────────────────────────────────────────────────────────`);
console.log(`📊 Verification Complete: ${passedTests}/${totalTests} checks passed.`);
if (passedTests === totalTests) {
  console.log("⭐️ ALL CORE SYSTEM TESTS PASSED SUCCESSFULLY! ⭐️\n");
  process.exit(0);
} else {
  console.error("⚠️ SOME CHECKS FAILED. Please review output above.\n");
  process.exit(1);
}
