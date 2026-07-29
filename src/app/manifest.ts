import type { MetadataRoute } from "next";
import { APP_CONFIG } from "@/config/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_CONFIG.fullName,
    short_name: APP_CONFIG.fullName,
    description: APP_CONFIG.description,
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0d13",
    theme_color: "#0b0d13",
    categories: ["fitness", "health", "productivity"],
    shortcuts: [
      {
        name: "ابدأ التمرينة",
        short_name: "التمرين",
        description: "افتح تمرينة النهارده",
        url: "/workout/today",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "التقدم",
        short_name: "التقدم",
        description: "افتح إحصائياتك",
        url: "/progress",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "الجروب",
        short_name: "الجروب",
        description: "افتح الجروب",
        url: "/group",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
