import { SERVICE_WORKER_URL } from "@/lib/constants";

async function clearDevelopmentServiceWorkers(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("ovrld-") || key.startsWith("gym-crew-"))
        .map((key) => caches.delete(key)),
    );
  }
}

/** Register the production service worker without allowing it to poison dev bundles. */
export function registerServiceWorker(): () => void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return () => undefined;
  }

  let cancelled = false;

  const start = async () => {
    if (process.env.NODE_ENV !== "production") {
      await clearDevelopmentServiceWorkers();
      return;
    }

    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      updateViaCache: "none",
    });

    if (!cancelled) {
      await registration.update().catch(() => undefined);
    }
  };

  const onLoad = () => {
    void start().catch((error: unknown) => {
      console.error("Service worker registration failed:", error);
    });
  };

  if (document.readyState === "complete") onLoad();
  else window.addEventListener("load", onLoad, { once: true });

  return () => {
    cancelled = true;
    window.removeEventListener("load", onLoad);
  };
}
