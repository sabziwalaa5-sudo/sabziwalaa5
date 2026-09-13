/** Server-safe catalog seed data (no browser APIs). */

export const INITIAL_RIDERS = [
  { id: "r1", name: "Rider Agent", email: "rider@gmail.com", mobile: "9810000001", status: "Online" },
  { id: "r2", name: "Delivery Desk", email: "delivery@gmail.com", mobile: "9810000002", status: "Standby" },
];

export const INITIAL_VENDORS = [
  { vendor_id: "v1", vendor_name: "Akshay Bhaiya", shop_name: "Akshay Farms (Rajokri Hub)", mobile: "9876543210", email: "sabziwalaa5@gmail.com", address: "Rajokri Crossroad, New Delhi", status: "Active", lat: 28.5305, lng: 77.1048 },
  { vendor_id: "v2", vendor_name: "Raman Kumar", shop_name: "Vasant Kunj Organic Depot", mobile: "9999888877", email: "raman@gmail.com", address: "Sector B-10, Vasant Kunj, Delhi", status: "Active", lat: 28.5450, lng: 77.1560 },
  { vendor_id: "v3", vendor_name: "Rahul Singh", shop_name: "Rajokri Green Hub", mobile: "9812345678", email: "rahul@gmail.com", address: "Rajokri Village, Delhi", status: "Inactive", lat: 28.5250, lng: 77.1050 },
];

export const INITIAL_CATEGORIES = [
  { id: "All", label: "All Items", icon: "🛒", imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80" },
  { id: "Vegetables", label: "Vegetables", icon: "🥦", imageUrl: "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400&q=80" },
  { id: "Fruits", label: "Fresh Fruits", icon: "🍎", imageUrl: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&q=80" },
  { id: "Dairy", label: "Dairy & Eggs", icon: "🥛", imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80" },
  { id: "Bakery", label: "Bakery", icon: "🍞", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80" },
  { id: "Grocery", label: "Staples & Oils", icon: "🧅", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80" },
  { id: "Organics", label: "Farm Special", icon: "🌿", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80" },
];

export const INITIAL_PRODUCTS = [
  { id: "p1", name: "Pahadi Organic Potatoes", hindiName: "जैविक पहाड़ी आलू", price: 40, oldPrice: 55, unit: "1 kg", image: "🥔", imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&q=80", category: "Vegetables", stock: 120, rating: 4.8, reviewsCount: 142, vendorId: "v1", badge: "bestseller", isSeasonal: true, isFarmFresh: true },
  { id: "p2", name: "Nasik Red Onions", hindiName: "ताजा नासिक प्याज", price: 60, oldPrice: 80, unit: "1 kg", image: "🧅", imageUrl: "https://images.unsplash.com/photo-1508747703725-719777637510?w=500&q=80", category: "Vegetables", stock: 95, rating: 4.9, reviewsCount: 210, vendorId: "v1", badge: "organic", isSeasonal: false, isFarmFresh: true },
  { id: "p3", name: "Desi Vine Tomatoes", hindiName: "देसी लाल टमाटर", price: 45, oldPrice: 65, unit: "500 g", image: "🍅", imageUrl: "https://images.unsplash.com/photo-1546470427-e26264be0b0c?w=500&q=80", category: "Vegetables", stock: 80, rating: 4.7, reviewsCount: 98, vendorId: "v2", badge: "organic", isSeasonal: true, isFarmFresh: true },
  { id: "p4", name: "Alphonso Ratnagiri Mangoes", hindiName: "ताजा हापुस आम", price: 240, oldPrice: 320, unit: "1 kg", image: "🥭", imageUrl: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&q=80", category: "Fruits", stock: 45, rating: 5.0, reviewsCount: 310, vendorId: "v2", badge: "bestseller", isSeasonal: true, isFarmFresh: true },
  { id: "p5", name: "Baby Spinach Bunch", hindiName: "ताजा हरी पालक", price: 28, oldPrice: 40, unit: "250 g", image: "🥬", imageUrl: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&q=80", category: "Vegetables", stock: 60, rating: 4.6, reviewsCount: 76, vendorId: "v1", badge: "organic", isSeasonal: false, isFarmFresh: true },
  { id: "p6", name: "Organic Hass Avocados", hindiName: "जैविक एवोकैडो", price: 180, oldPrice: 240, unit: "2 pcs", image: "🥑", imageUrl: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500&q=80", category: "Fruits", stock: 35, rating: 4.9, reviewsCount: 88, vendorId: "v2", badge: "bestseller", isSeasonal: true, isFarmFresh: false },
  { id: "p7", name: "Fresh A2 Farm Milk", hindiName: "शुद्ध A2 गाय का दूध", price: 75, oldPrice: 85, unit: "1 Litre", image: "🥛", imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80", category: "Dairy", stock: 50, rating: 4.9, reviewsCount: 240, vendorId: "v1", badge: "organic", isSeasonal: false, isFarmFresh: true },
  { id: "p8", name: "Artisanal Whole Wheat Bread", hindiName: "होल व्हीट ब्रेड", price: 55, oldPrice: 70, unit: "400 g", image: "🍞", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80", category: "Bakery", stock: 40, rating: 4.8, reviewsCount: 64, vendorId: "v2", badge: null, isSeasonal: false, isFarmFresh: false },
  { id: "p9", name: "Crisp Shimla Apples", hindiName: "ताजा शिमला सेब", price: 160, oldPrice: 200, unit: "1 kg", image: "🍎", imageUrl: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&q=80", category: "Fruits", stock: 70, rating: 4.7, reviewsCount: 115, vendorId: "v1", badge: "bestseller", isSeasonal: true, isFarmFresh: true },
  { id: "p10", name: "Organic Farm Eggs", hindiName: "देसी मुर्गी के अंडे", price: 90, oldPrice: 110, unit: "6 pcs", image: "🥚", imageUrl: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=500&q=80", category: "Dairy", stock: 85, rating: 4.8, reviewsCount: 190, vendorId: "v1", badge: "organic", isSeasonal: false, isFarmFresh: true },
];

export const INITIAL_REVIEWS = [
  { id: "r1", name: "Priya Sharma", location: "Vasant Kunj", rating: 5, comment: "The organic Pahadi potatoes & Alphonso mangoes delivered from Rajokri Hub were amazingly fresh! Loved the rapid hyperlocal delivery.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80", date: "2 days ago" },
  { id: "r2", name: "Vikram Malhotra", location: "Rajokri Crossroad", rating: 5, comment: "Super impressed by the quality of A2 milk and organic spinach. Zero pesticides taste real!", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80", date: "Yesterday" },
  { id: "r3", name: "Ananya Iyer", location: "DLF Phase 3", rating: 5, comment: "The UI is so sleek, fast and modern! Loved using points for instant cashback discounts.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80", date: "3 hours ago" },
];

export const INITIAL_ORDERS = [
  {
    id: "SBJ50001",
    date: "2026-06-24 10:15 AM",
    customerName: "Aman Sharma",
    customerEmail: "aman@gmail.com",
    customerMobile: "9876549876",
    deliveryAddress: "Pocket A-1, Rajokri, New Delhi",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    orderStatus: "Delivered",
    items: [
      { productId: "p1", name: "Pahadi Organic Potatoes", qty: 2, price: 40, subtotal: 80 },
      { productId: "p2", name: "Nasik Red Onions", qty: 1, price: 60, subtotal: 60 },
    ],
    subtotal: 140,
    deliveryCharges: 30,
    discount: 0,
    totalAmount: 170,
    vendorId: "v1",
  },
  {
    id: "SBJ50002",
    date: "2026-06-24 11:30 AM",
    customerName: "Sneha Patel",
    customerEmail: "sneha@gmail.com",
    customerMobile: "9912344321",
    deliveryAddress: "Block B, Vasant Kunj, Delhi",
    paymentMethod: "Google Pay",
    paymentStatus: "Paid",
    orderStatus: "Pending",
    items: [
      { productId: "p3", name: "Desi Vine Tomatoes", qty: 2, price: 45, subtotal: 90 },
      { productId: "p4", name: "Alphonso Ratnagiri Mangoes", qty: 1, price: 240, subtotal: 240 },
    ],
    subtotal: 330,
    deliveryCharges: 0,
    discount: 20,
    totalAmount: 310,
    vendorId: "v2",
  },
];

export const INITIAL_WALLETS: Record<string, {
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  history: Array<{ id: string; type: string; points: number; orderId: string; date: string; balance: number }>;
}> = {
  "raman@gmail.com": {
    pointsBalance: 150,
    lifetimeEarned: 200,
    lifetimeRedeemed: 50,
    history: [
      { id: "tx_r1", type: "EARNED", points: 200, orderId: "SBJ50001", date: "2026-06-25 09:30 AM", balance: 200 },
      { id: "tx_r2", type: "REDEEMED", points: 50, orderId: "SBJ50002", date: "2026-06-25 11:45 AM", balance: 150 },
    ],
  },
  "rahul@gmail.com": {
    pointsBalance: 40,
    lifetimeEarned: 40,
    lifetimeRedeemed: 0,
    history: [{ id: "tx_l1", type: "EARNED", points: 40, orderId: "SBJ50001", date: "2026-06-25 10:15 AM", balance: 40 }],
  },
};

export const INITIAL_COUPONS = [
  { code: "FRESH20", discountType: "percentage", discountValue: 20, minOrder: 150, maxDiscount: 50 },
  { code: "FLAT50", discountType: "fixed", discountValue: 50, minOrder: 300 },
];

export const INITIAL_CAMPAIGNS = [
  { id: "bc1", name: "Welcome Bonus Campaign", points: 50, active: true },
  { id: "bc2", name: "Festival Organic Week", points: 20, active: false },
];
