import type { Metadata, Viewport } from "next";
import "@fontsource-variable/sora";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "9th LNH Symposium 2027 — Shaping the New Era of Healthcare", template: "%s · 9th LNH Symposium" },
  description: "9th LNH Symposium, 29–31 January 2027, Liaquat National Hospital, Karachi. Shaping the New Era of Healthcare: Convergence of AI, Robotics & Digitization — keynotes, scientific sessions and hands-on workshops.",
  icons: { icon: "/favicon.svg" },
  openGraph: { images: ["/brand/symposium-poster.jpg"] },
};
export const viewport: Viewport = { themeColor: "#040B1E" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* apply the visitor's saved theme before paint (public site only; admin ignores it) */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("lnh-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
