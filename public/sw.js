// Service Worker para kevinborja.com
// Estrategia: Network-first para navegación, Stale-While-Revalidate para assets estáticos

const CACHE_NAME = "kevinborja-v4";
const OFFLINE_URL = "/offline.html";

// Rutas principales para pre-cachear (con trailing slash por configuración de Astro)
const PRECACHE_URLS = [OFFLINE_URL, "/", "/archive/", "/about/"];

// Límite máximo de entradas en caché para assets
const MAX_CACHE_ENTRIES = 80;

// Install: pre-cachear recursos críticos
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => {
				// Usar addAll solo para offline.html que es seguro
				// Para las rutas HTML, usar fetch individual para evitar fallos
				return cache.add(OFFLINE_URL).then(() => {
					// Pre-cachear rutas de forma individual (no falla si una no responde)
					const precachePromises = PRECACHE_URLS.filter(
						(url) => url !== OFFLINE_URL,
					).map((url) =>
						fetch(url, { credentials: "same-origin" })
							.then((response) => {
								if (response.ok) {
									return cache.put(url, response);
								}
							})
							.catch(() => {
								// Silenciar errores individuales de pre-cache
							}),
					);
					return Promise.all(precachePromises);
				});
			})
			.then(() => self.skipWaiting()),
	);
});

// Activate: limpiar cachés antiguas
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) => {
				return Promise.all(
					cacheNames
						.filter((name) => name !== CACHE_NAME)
						.map((name) => caches.delete(name)),
				);
			})
			.then(() => self.clients.claim()),
	);
});

// Limitar el número de entradas en la caché
let cacheUpdateCounter = 0;
async function trimCache(cacheName, maxEntries) {
	const cache = await caches.open(cacheName);
	const keys = await cache.keys();
	if (keys.length > maxEntries) {
		// Eliminar las entradas más antiguas (las primeras) en paralelo
		const deleteCount = keys.length - maxEntries;
		const deletePromises = [];
		for (let i = 0; i < deleteCount; i++) {
			deletePromises.push(cache.delete(keys[i]));
		}
		await Promise.all(deletePromises);
	}
}

// Fetch: estrategia diferenciada
self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") return;
	if (!event.request.url.startsWith("http")) return;

	const url = new URL(event.request.url);

	// Navegación: Network-first con fallback a caché y luego a offline.html
	if (event.request.mode === "navigate") {
		event.respondWith(
			fetch(event.request)
				.then((response) => {
					if (response.ok) {
						const clone = response.clone();
						caches
							.open(CACHE_NAME)
							.then((cache) => cache.put(event.request, clone));
					}
					return response;
				})
				.catch(() => {
					return caches
						.match(event.request)
						.then((cached) => cached || caches.match(OFFLINE_URL));
				}),
		);
		return;
	}

	// Assets estáticos (CSS, JS, fuentes, imágenes): Stale-While-Revalidate
	const isStaticAsset =
		url.pathname.startsWith("/_astro/") ||
		/\.(css|js|woff2?|ttf|png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname);

	if (isStaticAsset) {
		event.respondWith(
			caches.match(event.request).then((cached) => {
				const fetchPromise = fetch(event.request)
					.then((response) => {
						if (response.ok) {
							const clone = response.clone();
							caches.open(CACHE_NAME).then((cache) => {
								cache.put(event.request, clone);
								// Limpiar caché periódicamente (cada 10 peticiones)
								cacheUpdateCounter++;
								if (cacheUpdateCounter >= 10) {
									cacheUpdateCounter = 0;
									trimCache(CACHE_NAME, MAX_CACHE_ENTRIES);
								}
							});
						}
						return response;
					})
					.catch(() => {
						// Si no hay caché ni red, devolver respuesta vacía
						return new Response("", { status: 503 });
					});

				// Devolver caché inmediatamente si existe, sino esperar la red
				return cached || fetchPromise;
			}),
		);
		return;
	}

	// Otros recursos: Network-first con fallback a caché
	event.respondWith(
		fetch(event.request)
			.then((response) => {
				if (response.ok) {
					const clone = response.clone();
					caches
						.open(CACHE_NAME)
						.then((cache) => cache.put(event.request, clone));
				}
				return response;
			})
			.catch(() =>
				caches
					.match(event.request)
					.then((cached) => cached || new Response("", { status: 503 })),
			),
	);
});

// Handler de mensajes para actualizaciones desde el cliente
self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "SKIP_WAITING") {
		self.skipWaiting();
	}
});
