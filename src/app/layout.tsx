import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/providers/AppProviders";
import { APP_CONFIG } from "@/config/app";
import { STORAGE_KEYS } from "@/config/storage";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: APP_CONFIG.name,
    template: `%s · ${APP_CONFIG.name}`,
  },
  description: APP_CONFIG.description,
  applicationName: APP_CONFIG.name,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: APP_CONFIG.name,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d13" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const appBootstrap = `
(function () {
  try {
    var root = document.documentElement;

    var language = localStorage.getItem("${STORAGE_KEYS.language}") || localStorage.getItem("${STORAGE_KEYS.legacyLanguage}");
    if (language !== "ar" && language !== "en") language = "ar";
    localStorage.setItem("${STORAGE_KEYS.language}", language);
    root.lang = language === "ar" ? "ar-EG" : "en";
    root.dir = language === "ar" ? "rtl" : "ltr";
    root.dataset.gcLanguage = language;
    if (language === "en") root.dataset.gcI18nPending = "true";

    var theme = localStorage.getItem("${STORAGE_KEYS.theme}") || localStorage.getItem("${STORAGE_KEYS.legacyTheme}");
    if (theme !== "light" && theme !== "dark") {
      theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    localStorage.setItem("${STORAGE_KEYS.theme}", theme);
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.dataset.gcTheme = theme;
    root.style.colorScheme = theme;

    setTimeout(function () { root.removeAttribute("data-gc-i18n-pending"); }, 1800);
  } catch (_) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar-EG"
      dir="rtl"
      suppressHydrationWarning
      className="light h-full antialiased"
      data-scroll-behavior="smooth"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: appBootstrap }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
