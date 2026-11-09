import type { MetadataRoute } from "next";
export const dynamic = "force-dynamic";
import { appUrl } from "@/lib/utils";

/** robots.txt (release 3, audit M6): public pages indexed; admin, account, checkout and private ticket links kept out of search. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/account", "/checkout", "/register/success", "/pay", "/invite", "/r/", "/verify", "/feedback"] }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
