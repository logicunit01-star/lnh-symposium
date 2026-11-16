import type { Metadata, Viewport } from "next";
import "@fontsource-variable/sora";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "9th LNH Symposium 2027 — Shaping the New Era of Healthcare", template: "%s · 9th LNH Symposium" },
  description: "9th LNH Symposium, 29–31 January 2027, Liaquat National Hospital, Karachi. Shaping the New Era of Healthcare: Convergence of AI, Robotics & Digitization — keynotes, scientific sessions and pre-symposium workshops.",
  // favicon: src/app/icon.png, apple-icon.png and favicon.ico (the LNH mark, issues sheet 16 Nov 2026)
  openGraph: { images: ["/brand/symposium-poster.jpg"] },
};
export const viewport: Viewport = { themeColor: "#040B1E" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Day view is the default (homepage changes 11.11.2026); a visitor's saved choice is applied before paint (public site only) */}
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add("js");try{var t=localStorage.getItem("lnh-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
