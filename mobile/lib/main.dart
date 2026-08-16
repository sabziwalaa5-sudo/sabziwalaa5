import 'package:flutter/material';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Supabase SDK client (uses free-tier hosted instance credentials)
  await Supabase.initialize(
    url: 'https://placeholder-project.supabase.co',
    anonKey: 'placeholder-anon-key',
  );

  runApp(const SabjiwalaApp());
}

class SabjiwalaApp extends StatelessWidget {
  const SabjiwalaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SABJIWALAA ५ - Mobile',
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFF22C55E),
        scaffoldBackgroundColor: const Color(0xFF0F1711),
        useMaterial3: true,
      ),
      home: const RoleSelectorScreen(),
    );
  }
}

class RoleSelectorScreen extends StatelessWidget {
  const RoleSelectorScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SABJIWALAA ५ (Free MVP)'),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Select Dashboard Role',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              icon: const Icon(Icons.shopping_cart),
              label: const Text('Customer Portal'),
              onPressed: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const CustomerDashboard()));
              },
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              icon: const Icon(Icons.storefront),
              label: const Text('Vendor Dashboard'),
              onPressed: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const VendorDashboard()));
              },
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              icon: const Icon(Icons.delivery_dining),
              label: const Text('Rider Delivery Board'),
              onPressed: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const DeliveryDashboard()));
              },
            ),
          ],
        ),
      ),
    );
  }
}

class CustomerDashboard extends StatefulWidget {
  const CustomerDashboard({super.key});

  @override
  State<CustomerDashboard> createState() => _CustomerDashboardState();
}

class _CustomerDashboardState extends State<CustomerDashboard> {
  String orderStatus = "PLACED";
  final supabase = Supabase.instance.client;

  @override
  void initState() {
    super.initState();
    subscribeToOrderStatus();
  }

  void subscribeToOrderStatus() {
    // Realtime Database replication hook
    supabase
        .channel('public:orders')
        .onPostgresChanges(
            event: PostgresChangeEvent.update,
            schema: 'public',
            table: 'orders',
            callback: (payload) {
              setState(() {
                orderStatus = payload.newRecord['order_status'] ?? 'Pending';
              });
            })
        .subscribe();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Customer Storefront')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.location_on, size: 82, color: Colors.greenAccent),
            const SizedBox(height: 16),
            const Text(
              'Leaflet OpenStreetMap equivalent for Flutter maps loaded',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 24),
            Text(
              'Order Status: $orderStatus',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.greenAccent),
            ),
          ],
        ),
      ),
    );
  }
}

class VendorDashboard extends StatelessWidget {
  const VendorDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Akshay Organic Farm')),
      body: const Center(
        child: Text('Vendor incoming queues & products catalog listings'),
      ),
    );
  }
}

class DeliveryDashboard extends StatelessWidget {
  const DeliveryDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Rider Tracking Portal')),
      body: const Center(
        child: Text('Pushing location coordinates to public.driver_positions table'),
      ),
    );
  }
}
