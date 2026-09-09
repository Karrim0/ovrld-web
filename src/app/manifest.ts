import type { MetadataRoute } from "next";
import { APP_CONFIG } from "@/config/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_CONFIG.fullName,
    short_name: APP_CONFIG.name,
    description: APP_CONFIG.englishDescription,
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07100d",
    theme_color: "#07100d",
    categories: ["fitness", "health", "productivity"],
    shortcuts: [
      {
        name: "Start workout",
        short_name: "Workout",
        description: "Open today’s workout",
        url: "/workout/today",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Progress",
        short_name: "Progress",
        description: "Open your progress",
        url: "/progress",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Log weight",
        short_name: "Weight",
        description: "Open body tracking",
        url: "/progress/body",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
