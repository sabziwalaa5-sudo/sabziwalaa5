import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

const liveOrigin = 'https://web-sabziwalaa5.vercel.app';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SabjiwalaApp());
}

class SabjiwalaApp extends StatelessWidget {
  const SabjiwalaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SABJIWALAA ५',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF15803D)),
        useMaterial3: true,
      ),
      home: const RoleSelectorScreen(),
    );
  }
}

class RoleSelectorScreen extends StatelessWidget {
  const RoleSelectorScreen({super.key});

  void open(BuildContext context, String title, String path) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => PortalWebView(title: title, path: path)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF14532D),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 24),
              const Text(
                '🥬\nSABJIWALAA ५',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              const Text(
                'Mobile app for the live storefront, admin, vendor, and rider portals.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70),
              ),
              const Spacer(),
              _RoleButton(label: 'Customer', onTap: () => open(context, 'Customer', '/')),
              _RoleButton(label: 'Admin', onTap: () => open(context, 'Admin', '/admin')),
              _RoleButton(label: 'Vendor', onTap: () => open(context, 'Vendor', '/vendor')),
              _RoleButton(label: 'Rider', onTap: () => open(context, 'Rider', '/rider')),
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleButton extends StatelessWidget {
  const _RoleButton({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: FilledButton(
        onPressed: onTap,
        style: FilledButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: const Color(0xFF15803D),
          padding: const EdgeInsets.symmetric(vertical: 16),
        ),
        child: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
    );
  }
}

class PortalWebView extends StatefulWidget {
  const PortalWebView({super.key, required this.title, required this.path});
  final String title;
  final String path;

  @override
  State<PortalWebView> createState() => _PortalWebViewState();
}

class _PortalWebViewState extends State<PortalWebView> {
  late final WebViewController controller;

  @override
  void initState() {
    super.initState();
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse('$liveOrigin${widget.path}'));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: WebViewWidget(controller: controller),
    );
  }
}
