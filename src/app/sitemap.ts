import type { MetadataRoute } from "next";
import { getProgramme } from "@/lib/queries";
import { appUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** sitemap.xml (release 3, audit M6): main pages plus one page per session and workshop. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const pages = ["", "/about", "/committee", "/awards", "/venues", "/contact", "/agenda", "/speakers", "/sessions", "/workshops", "/abstracts", "/abstracts/book", "/register", "/my-registrations"];
  const prog = await getProgramme().catch(() => []);
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...prog.filter((p) => p.type !== "BREAK").map((p) => ({ url: `${base}/${p.type === "WORKSHOP" ? "workshops" : "sessions"}/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
