"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global { interface Window { dataLayer: unknown[]; gtag?: (...a: unknown[]) => void; __ga4?: boolean } }

/**
 * Google Analytics 4 (LNH, 18 Nov 2026: main LNH Measurement ID). Public website only; the admin console is not tracked.
 * Page views are sent by this component with a cleaned address: personal links (e-ticket tokens, invitation links,
 * registration numbers) and every query string (?t=…) are removed, so no participant data goes to Google.
 */
const clean = (p: string) => p
  .replace(/^\/register\/success\/[^/]+/, "/register/success/:token")
  .replace(/^\/invite\/[^/]+/, "/invite/:token")
  .replace(/^\/r\/[^/]+/, "/r/:regno")
  .replace(/^\/verify\/[^/]+/, "/verify/:code")
  .replace(/^\/pay\/.*/, "/pay");

export function Analytics({ id }: { id: string }) {
  const path = usePathname();
  useEffect(() => {
    if (!id || !path) return;
    // the standard gtag queue; gtag.js (loaded below) processes it in order once it arrives
    window.dataLayer = window.dataLayer || [];
    // eslint-disable-next-line prefer-rest-params
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    const page = clean(path), loc = location.origin + page;
    if (!window.__ga4) { window.__ga4 = true; window.gtag("js", new Date()); window.gtag("config", id, { send_page_view: false, page_location: loc }); }
    const t = setTimeout(() => {
      window.gtag!("set", { page_location: loc, page_path: page }); // later automatic events use the cleaned address too
      window.gtag!("event", "page_view", { page_location: loc, page_path: page, page_title: document.title });
    }, 50); // after the new page's title is set
    return () => clearTimeout(t);
  }, [id, path]);
  if (!id) return null;
  return <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`} strategy="afterInteractive" />;
}
