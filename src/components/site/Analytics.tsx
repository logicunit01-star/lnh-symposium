"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

declare global { interface Window { dataLayer: unknown[]; gtag?: (...a: unknown[]) => void; __gtm?: boolean } }

/**
 * Google Tag Manager (LNH, 23 Nov 2026: container GTM-W2W8D2H4 replaces the direct GA4 code of 18 Nov). Public website only;
 * the admin console is not tracked. GA4 and any other tags are set up by LNH inside the GTM container.
 *
 * Personal links (e-ticket tokens, invitation links, registration numbers, ?t= codes) must not reach Google:
 * - GTM is not loaded while the visitor is on a personal page; it loads on the first public page they open.
 * - Every page change pushes a "virtual_page_view" event with the cleaned address (page_path, page_location, page_title),
 *   and gtag "set" gives the cleaned address to Google tags in the container.
 */
const PERSONAL = /^\/(register\/success|invite|r|verify|pay)\//;
const clean = (p: string) => p
  .replace(/^\/register\/success\/[^/]+/, "/register/success/:token")
  .replace(/^\/invite\/[^/]+/, "/invite/:token")
  .replace(/^\/r\/[^/]+/, "/r/:regno")
  .replace(/^\/verify\/[^/]+/, "/verify/:code")
  .replace(/^\/pay\/.*/, "/pay");

export function Analytics({ id }: { id: string }) {
  const path = usePathname();
  const [load, setLoad] = useState(false);
  useEffect(() => {
    if (!id || !path) return;
    window.dataLayer = window.dataLayer || [];
    // eslint-disable-next-line prefer-rest-params
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    const page = clean(path), loc = location.origin + page;
    const personal = PERSONAL.test(path) || new URLSearchParams(location.search).has("t");
    if (!window.__gtm) {
      if (personal) return; // wait for a public page before loading GTM
      window.__gtm = true;
      window.gtag("js", new Date());
      window.gtag("set", { page_location: loc, page_path: page });
      window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" }); // the standard GTM start event
      setLoad(true);
    }
    const t = setTimeout(() => {
      window.gtag!("set", { page_location: loc, page_path: page });
      window.dataLayer.push({ event: "virtual_page_view", page_path: page, page_location: loc, page_title: document.title });
    }, 50); // after the new page's title is set
    return () => clearTimeout(t);
  }, [id, path]);
  if (!id || !load) return null;
  return <Script id="gtm" src={`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`} strategy="afterInteractive" />;
}
