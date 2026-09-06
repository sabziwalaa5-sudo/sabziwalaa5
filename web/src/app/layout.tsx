import type { Metadata, Viewport } from "next";
import "./globals.css";
import NativeShell from "../components/NativeShell";
import OpsBanner from "../components/OpsBanner";

export const metadata: Metadata = {
  title: "SABJIWALAA ५ - Hyperlocal Organic Grocery Marketplace",
  description: "Fresh organic produce delivered from local farms. Shop vegetables, fruits, dairy, and staples with live order tracking.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://web-sabziwalaa5.vercel.app"),
  openGraph: {
    title: "SABJIWALAA ५",
    description: "Hyperlocal organic grocery marketplace",
    type: "website",
    locale: "en_IN",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    title: "Sabjiwala",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#15803d",
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
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/images/logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <NativeShell />
        <OpsBanner />
        {children}
      </body>
    </html>
  );
}
