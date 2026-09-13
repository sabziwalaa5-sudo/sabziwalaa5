import { redirect } from "next/navigation";

/** Legacy Capacitor start URL. Production 404'd here; send users to the storefront. */
export default function LegacyAppEntryPage() {
  redirect("/");
}
