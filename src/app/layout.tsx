import type { Metadata, Viewport } from "next";
import "@fontsource-variable/sora";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LNH Symposium — Healthcare Conundrum: Cost, Quality & Technology", template: "%s · LNH Symposium" },
  description: "The annual Liaquat National Hospital Symposium, Karachi — keynotes, plenaries, scientific sessions and hands-on workshops on cost, quality and technology in healthcare.",
  icons: { icon: "/favicon.svg" },
};
export const viewport: Viewport = { themeColor: "#040B1E" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
