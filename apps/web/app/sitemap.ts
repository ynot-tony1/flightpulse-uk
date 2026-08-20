import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const ROUTES = [
  "",
  "/airports",
  "/routes",
  "/airlines",
  "/punctuality",
  "/compare",
  "/map",
  "/status",
  "/about/data",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
  }));
}
