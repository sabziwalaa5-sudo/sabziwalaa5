import type { CapacitorConfig } from "@capacitor/cli";

const liveServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.sabjiwala.app",
  appName: "Sabjiwala",
  webDir: "native-www",
  android: {
    allowMixedContent: false,
    backgroundColor: "#15803d",
    webContentsDebuggingEnabled: process.env.NODE_ENV !== "production",
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#15803d",
    preferredContentMode: "mobile",
    scheme: "Sabjiwala",
  },
  server: {
    androidScheme: "https",
    iosScheme: "https",
    hostname: "localhost",
    allowNavigation: [
      "web-sabziwalaa5.vercel.app",
      "*.vercel.app",
      "*.supabase.co",
      "*.razorpay.com",
      "checkout.razorpay.com",
      "api.razorpay.com",
    ],
    url: liveServerUrl || "https://web-sabziwalaa5.vercel.app",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#15803d",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#15803d",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
