import type { Metadata } from "next";
import MobileLauncher from "../../components/MobileLauncher";

export const metadata: Metadata = {
  title: "Sabjiwala app",
  description: "Open the Sabjiwala customer, admin, vendor, or rider app.",
  appleWebApp: {
    capable: true,
    title: "Sabjiwala",
    statusBarStyle: "black-translucent",
  },
};

export default function MobileAppsPage() {
  return <MobileLauncher />;
}
