import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SABJIWALAA ५ - Hyperlocal Organic Grocery Marketplace",
  description: "Next-gen hyperlocal vegetable and grocery marketplace with sub-minute routing and real-time live order tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
          crossOrigin="" 
        />
        <script 
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" 
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" 
          crossOrigin=""
          defer
        ></script>
        <script 
          src="https://maps.googleapis.com/maps/api/js?key=&libraries=places"
          defer
        ></script>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#15803d" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              // Step 1: Unregister ALL old service workers first
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                var unregisterAll = registrations.map(function(reg) {
                  return reg.unregister();
                });
                return Promise.all(unregisterAll);
              }).then(function() {
                // Step 2: Register the new versioned SW
                return navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
              }).then(function(reg) {
                console.log('[SW] Registered v3:', reg.scope);
                // Force update check on every page load
                reg.update();
              }).catch(function(err) {
                console.error('[SW] Registration error:', err);
              });
            });
          }
        `}} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
