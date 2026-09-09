const CACHE_VERSION = "v17";
const STATIC_CACHE = `ovrld-static-${CACHE_VERSION}`;
const PAGE_CACHE = `ovrld-pages-${CACHE_VERSION}`;
const APP_CACHE_PREFIXES = ["ovrld-", "gym-crew-"];
const OFFLINE_ROUTES = new Set([
  "/dashboard",
  "/workout",
  "/workout/today",
  "/workout/active",
  "/workout/history",
  "/split/personal",
  "/progress",
  "/progress/records",
  "/progress/exercises",
  "/progress/body-map",
  "/progress/body",
  "/progress/gain",
  "/progress/gain/review",
  "/group",
  "/profile",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.add("/manifest.webmanifest")),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(
        keys
          .filter((key) => APP_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) && ![STATIC_CACHE, PAGE_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      )),
      self.clients.claim(),
    ]),
  );
});

function isNextDataRequest(request, url) {
  return Boolean(
    request.headers.get("RSC") ||
    request.headers.get("Next-Router-State-Tree") ||
    request.headers.get("Next-Url") ||
    url.searchParams.has("_rsc") ||
    url.pathname.startsWith("/_next/data/")
  );
}

function canCacheNavigation(pathname) {
  for (const route of OFFLINE_ROUTES) {
    if (pathname === route || pathname.startsWith(`${route}/`)) return true;
  }
  return false;
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    return new Response(
      "OVRLD is offline. Reconnect once to cache this page, then try again.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;
  if (isNextDataRequest(request, url)) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  if (request.mode === "navigate" && canCacheNavigation(url.pathname)) {
    event.respondWith(networkFirstNavigation(request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_PRIVATE_CACHE") {
    event.waitUntil(caches.delete(PAGE_CACHE));
  }

  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});


self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = typeof event.notification.data?.url === "string"
    ? event.notification.data.url
    : "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        if ("navigate" in existing) existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    }),
  );
});
