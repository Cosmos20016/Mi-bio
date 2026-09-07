<script lang="ts">
	import { onDestroy, onMount } from "svelte";

	// ============================================
	// Constantes
	// ============================================
	const STORAGE_KEY = "urlshortener:urls:v2";
	const SETTINGS_KEY = "urlshortener:settings:v1";
	const ONBOARDING_KEY = "urlshortener:onboarding:done:v1";
	const MAX_URLS = 100;
	const MAX_ALIAS_LENGTH = 30;
	const COPY_FEEDBACK_DURATION = 2000;
	const TOAST_DURATION = 3000;
	const MAX_INPUT_LENGTH = 2048;
	const METADATA_TIMEOUT_MS = 2500;

	// Alfabeto nano-id sin caracteres ambiguos (sin 0, O, o, 1, l, I)
	const UNAMBIGUOUS_CHARS = "23456789abcdefghjkmnpqrstuvwxyz";

	// ============================================
	// Types
	// ============================================
	type SortBy = "date" | "copies" | "name";
	type ViewMode = "grid" | "list";
	type CategoryId =
		| "all"
		| "tech"
		| "dev"
		| "social"
		| "entertainment"
		| "news"
		| "shopping"
		| "education"
		| "finance"
		| "health"
		| "sports"
		| "work"
		| "personal"
		| "other";

	interface ShortenedUrl {
		id: string;
		originalUrl: string;
		shortUrl: string;
		alias: string;
		createdAt: string;
		copyCount: number;
		category: CategoryId;
		domainHue?: number;
	}

	interface Category {
		id: CategoryId;
		label: string;
		icon: string;
	}

	interface UrlMetadata {
		title: string;
		description: string;
		ogTitle: string;
	}

	interface CategoryRule {
		domains: readonly string[];
		keywords: readonly string[];
	}

	// ============================================
	// Categorías (Estructura expandida con preservación de compatibilidad)
	// ============================================
	const CATEGORIES: readonly Category[] = [
		{ id: "all", label: "Todos", icon: "📋" },
		{ id: "tech", label: "Tecnología", icon: "💡" },
		{ id: "dev", label: "Desarrollo", icon: "💻" },
		{ id: "social", label: "Social", icon: "📱" },
		{ id: "entertainment", label: "Entretenimiento", icon: "🎬" },
		{ id: "news", label: "Noticias", icon: "📰" },
		{ id: "shopping", label: "Compras", icon: "🛍️" },
		{ id: "education", label: "Educación", icon: "🎓" },
		{ id: "finance", label: "Finanzas", icon: "💰" },
		{ id: "health", label: "Salud", icon: "🏥" },
		{ id: "sports", label: "Deportes", icon: "⚽" },
		{ id: "work", label: "Trabajo", icon: "💼" },
		{ id: "personal", label: "Personal", icon: "🏠" },
		{ id: "other", label: "Otros", icon: "🔗" },
	] as const;

	const CATEGORY_MAP: Record<CategoryId, Category> = CATEGORIES.reduce(
		(acc, cat) => {
			acc[cat.id] = cat;
			return acc;
		},
		{} as Record<CategoryId, Category>,
	);

	// ============================================
	// Reglas y Palabras Clave Robustas (ES/EN)
	// ============================================
	const CATEGORY_RULES: Record<
		Exclude<CategoryId, "all" | "work" | "personal" | "other">,
		CategoryRule
	> = {
		tech: {
			domains: [
				"techcrunch.com", "theverge.com", "wired.com", "cnet.com", "engadget.com",
				"xataka.com", "genbeta.com", "gizmodo.com", "arstechnica.com", "slashdot.org",
				"tomshardware.com", "gsmarena.com", "macrumors.com", "venturebeat.com",
			],
			keywords: [
				"tech", "technology", "tecnologia", "tecnología", "gadget", "gadgets", "ai", "ia",
				"artificial intelligence", "inteligencia artificial", "software", "hardware",
				"device", "dispositivo", "electronics", "electronica", "electrónica", "robotics",
				"robotica", "robótica", "cybersecurity", "ciberseguridad", "smartphone", "mobile",
				"movil", "móvil", "innovation", "innovacion", "innovación", "computing", "computacion",
				"computación", "processor", "procesador", "iot", "chip", "quantum", "digital",
			],
		},
		dev: {
			domains: [
				"github.com", "gitlab.com", "bitbucket.org", "stackoverflow.com", "npmjs.com",
				"vercel.com", "netlify.com", "codepen.io", "codesandbox.io", "replit.com",
				"developer.mozilla.org", "dev.to", "hashnode.com", "docker.com", "kubernetes.io",
				"pypi.org", "w3schools.com", "stackexchange.com", "geeksforgeeks.org", "leetcode.com",
				"hackerrank.com", "railway.app", "render.com", "cloudflare.com", "supabase.com",
			],
			keywords: [
				"github", "gitlab", "bitbucket", "git", "programming", "programacion", "programación",
				"developer", "desarrollador", "desarrollo", "coding", "code", "codigo", "código",
				"api", "rest", "graphql", "sdk", "frontend", "backend", "fullstack", "javascript",
				"typescript", "python", "rust", "golang", "react", "svelte", "vue", "angular",
				"nodejs", "docker", "kubernetes", "database", "devops", "stackoverflow", "npm",
				"framework", "library", "libreria", "librería", "repository", "algoritmo",
			],
		},
		news: {
			domains: [
				"cnn.com", "bbc.com", "nytimes.com", "theguardian.com", "elpais.com",
				"elmundo.es", "reuters.com", "bloomberg.com", "infobae.com", "clarin.com",
				"elcolombiano.com", "eltiempo.com", "semana.com", "forbes.com", "huffpost.com",
				"washingtonpost.com", "apnews.com", "noticiascaracol.com", "news.google.com",
			],
			keywords: [
				"news", "noticias", "noticia", "periodico", "periódico", "diario", "prensa",
				"press", "journalism", "periodismo", "breaking", "urgente", "editorial",
				"chronicle", "cronica", "crónica", "reportaje", "titulares", "headlines",
				"actualidad", "boletin", "boletín", "newsletter", "report", "informe",
				"politics", "politica", "política", "newspaper", "gaceta", "comunicacion",
			],
		},
		entertainment: {
			domains: [
				"youtube.com", "youtu.be", "netflix.com", "disneyplus.com", "hbomax.com",
				"max.com", "primevideo.com", "twitch.tv", "vimeo.com", "imdb.com",
				"rottentomatoes.com", "letterboxd.com", "spotify.com", "soundcloud.com",
				"tidal.com", "deezer.com", "bandcamp.com", "ign.com", "gamespot.com",
				"steampowered.com", "epicgames.com", "crunchyroll.com",
			],
			keywords: [
                "entertainment", "entretenimiento", "movie", "movies", "pelicula", "película",
                "series", "film", "cinema", "cine", "trailer", "video", "stream", "streaming",
                "music", "musica", "música", "song", "cancion", "canción", "album", "artist",
                "artista", "gaming", "game", "videojuego", "juegos", "gamer", "comedy", "comedia",
                "show", "anime", "manga", "fun", "diversion", "diversión", "podcast",
			],
		},
		education: {
			domains: [
				"coursera.org", "udemy.com", "edx.org", "khanacademy.org", "duolingo.com",
				"platzi.com", "mit.edu", "stanford.edu", "harvard.edu", "wikipedia.org",
				"britannica.com", "academia.edu", "researchgate.net", "scholar.google.com",
				"codecademy.com", "openlibrary.org",
			],
			keywords: [
				"education", "educacion", "educación", "learn", "learning", "aprender",
				"aprendizaje", "course", "curso", "tutorial", "academy", "academia",
				"university", "universidad", "school", "escuela", "student", "estudiante",
				"teacher", "profesor", "lesson", "leccion", "lección", "study", "estudio",
				"scholar", "research", "investigacion", "investigación", "diploma", "certificacion",
				"certification", "lecture", "clase", "aula",
			],
		},
		shopping: {
			domains: [
				"amazon.com", "ebay.com", "aliexpress.com", "mercadolibre.com", "mercadolibre.com.co",
				"etsy.com", "walmart.com", "target.com", "bestbuy.com", "shopify.com",
				"alibaba.com", "shein.com", "falabella.com", "exito.com", "costco.com",
			],
			keywords: [
				"shopping", "shop", "compras", "comprar", "tienda", "store", "ecommerce",
				"e-commerce", "marketplace", "mercado", "cart", "carrito", "checkout",
				"buy", "price", "precio", "discount", "descuento", "oferta", "deal",
				"sale", "rebaja", "product", "producto", "order", "pedido", "shipping",
				"envio", "envío", "catalog", "catalogo", "catálogo", "coupon", "cupon", "cupón",
			],
		},
		social: {
			domains: [
				"facebook.com", "fb.com", "instagram.com", "twitter.com", "x.com",
				"tiktok.com", "linkedin.com", "threads.net", "pinterest.com", "reddit.com",
				"snapchat.com", "whatsapp.com", "telegram.org", "t.me", "bluesky.app",
				"bsky.app", "mastodon.social", "discord.com", "vk.com",
			],
			keywords: [
				"social", "network", "red social", "redes sociales", "community", "comunidad",
				"profile", "perfil", "follow", "seguir", "follower", "seguidor", "post",
				"publicacion", "publicación", "feed", "share", "compartir", "chat", "message",
				"mensaje", "forum", "foro", "tweet", "reels", "story", "friends", "amigos",
				"connect", "social media", "subscribers", "suscriptores",
			],
		},
		finance: {
			domains: [
				"binance.com", "coinbase.com", "coinmarketcap.com", "investing.com", "tradingview.com",
				"marketwatch.com", "paypal.com", "stripe.com", "bancolombia.com", "chase.com",
				"bankofamerica.com", "revolut.com", "robinhood.com", "bloomberg.com/finance",
			],
			keywords: [
				"finance", "finanzas", "financiero", "financial", "money", "dinero", "bank",
				"banco", "banking", "crypto", "cripto", "bitcoin", "btc", "ethereum",
				"invest", "investment", "inversion", "inversión", "trading", "bolsa",
				"stock", "stocks", "acciones", "wallet", "billetera", "payment", "pago",
				"loan", "prestamo", "préstamo", "credit", "credito", "crédito", "currency",
				"divisa", "economy", "economia", "economía",
			],
		},
		health: {
			domains: [
				"webmd.com", "healthline.com", "mayoclinic.org", "nih.gov", "who.int",
				"medlineplus.gov", "medicalnewstoday.com", "psychologytoday.com", "menshealth.com",
				"womenshealthmag.com", "minsalud.gov.co",
			],
			keywords: [
				"health", "salud", "medical", "medico", "médico", "medicine", "medicina",
				"doctor", "hospital", "clinic", "clinica", "clínica", "wellness", "bienestar",
				"fitness", "nutrition", "nutricion", "nutrición", "diet", "dieta", "workout",
				"ejercicio", "mental", "therapy", "terapia", "symptom", "sintoma", "síntoma",
				"disease", "enfermedad", "pharma", "farmacia", "patient", "paciente",
			],
		},
		sports: {
			domains: [
				"espn.com", "marca.com", "as.com", "mundodeportivo.com", "goal.com",
				"nba.com", "fifa.com", "uefa.com", "formula1.com", "f1.com",
				"motorsport.com", "strava.com", "olympics.com", "mlb.com", "nfl.com",
			],
			keywords: [
				"sport", "sports", "deporte", "deportes", "football", "futbol", "fútbol",
				"soccer", "basketball", "baloncesto", "tennis", "tenis", "baseball",
				"beisbol", "béisbol", "formula1", "f1", "racing", "carreras", "championship",
				"campeonato", "league", "liga", "tournament", "torneo", "player", "jugador",
				"team", "equipo", "match", "partido", "stadium", "estadio", "athlete", "atleta",
			],
		},
	};

	// ============================================
	// Utilidades Puras y Métricas
	// ============================================
	function clamp(value: number, min: number, max: number): number {
		return Math.min(Math.max(value, min), max);
	}

	function getDomainHue(url: string): number {
		try {
			const hostname = new URL(url).hostname.replace("www.", "");
			let hash = 0;
			for (let i = 0; i < hostname.length; i++) {
				hash = hostname.charCodeAt(i) + ((hash << 5) - hash);
			}
			return Math.abs(hash) % 360;
		} catch {
			return 200;
		}
	}

	function isValidUrl(url: string): boolean {
		try {
			const parsed = new URL(url);
			return parsed.protocol === "http:" || parsed.protocol === "https:";
		} catch {
			return false;
		}
	}

	function normalizeUrl(url: string): string {
		const trimmed = url.trim();
		if (!trimmed) return "";
		if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
		return trimmed;
	}

	function decodeHtmlEntities(str: string): string {
		return str
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&#x2F;/g, "/")
			.replace(/&nbsp;/g, " ");
	}

	function parseHtmlMetadata(html: string): UrlMetadata {
		let title = "";
		let description = "";
		let ogTitle = "";

		const ogTitleMatch =
			html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
			html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
		if (ogTitleMatch) ogTitle = decodeHtmlEntities(ogTitleMatch[1]);

		const descMatch =
			html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
			html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
			html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
		if (descMatch) description = decodeHtmlEntities(descMatch[1]);

		const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
		if (titleMatch) title = decodeHtmlEntities(titleMatch[1]);

		return {
			title: title.trim(),
			description: description.trim(),
			ogTitle: ogTitle.trim(),
		};
	}

	async function fetchUrlMetadata(url: string): Promise<UrlMetadata | null> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), METADATA_TIMEOUT_MS);

		try {
			const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
			const res = await fetch(proxyUrl, { signal: controller.signal });
			clearTimeout(timeoutId);

			if (res.ok) {
				const data = await res.json();
				if (data && typeof data.contents === "string") {
					return parseHtmlMetadata(data.contents);
				}
			}
		} catch {
			// Fallback controlado
		} finally {
			clearTimeout(timeoutId);
		}

		return null;
	}

	function fallbackTitleFromUrl(url: string): string {
		try {
			const parsed = new URL(url);
			const pathParts = parsed.pathname
				.split("/")
				.filter(Boolean)
				.map((p) => p.replace(/[-_]+/g, " ").replace(/\.[a-zA-Z0-9]+$/, "").trim())
				.filter((p) => p.length > 0 && !/^\d+$/.test(p));

			if (pathParts.length > 0) {
				return pathParts[pathParts.length - 1];
			}
			return parsed.hostname.replace(/^www\./, "").split(".")[0];
		} catch {
			return "";
		}
	}

	// ============================================
	// FUNCIONALIDAD 1: GENERADOR AUTOMÁTICO DE ALIAS
	// ============================================
	function isValidAlias(alias: string): boolean {
		if (!alias || alias.length > MAX_ALIAS_LENGTH) return false;
		return /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/.test(alias) && !alias.includes("--");
	}

	function generateRandomSlug(len = 7): string {
		let result = "";
		for (let i = 0; i < len; i++) {
			result += UNAMBIGUOUS_CHARS.charAt(Math.floor(Math.random() * UNAMBIGUOUS_CHARS.length));
		}
		return result;
	}

	function resolveAliasCollision(baseAlias: string, existingUrls: ShortenedUrl[]): string {
		const existingSet = new Set(existingUrls.map((u) => u.alias.toLowerCase()));
		if (!existingSet.has(baseAlias.toLowerCase())) {
			return baseAlias;
		}

		let counter = 2;
		while (counter < 1000) {
			const suffix = `-${counter}`;
			let prefix = baseAlias;
			if (prefix.length + suffix.length > MAX_ALIAS_LENGTH) {
				prefix = prefix.slice(0, MAX_ALIAS_LENGTH - suffix.length).replace(/-+$/, "");
			}
			const candidate = `${prefix}${suffix}`;
			if (!existingSet.has(candidate.toLowerCase())) {
				return candidate;
			}
			counter++;
		}

		while (true) {
			const rand = generateRandomSlug(4);
			const candidate = `${baseAlias.slice(0, 25).replace(/-+$/, "")}-${rand}`;
			if (!existingSet.has(candidate.toLowerCase())) {
				return candidate;
			}
		}
	}

	function generateSmartAlias(
		url: string,
		metadata: UrlMetadata | null,
		existingUrls: ShortenedUrl[],
	): string {
		let rawSource = "";

		if (metadata?.ogTitle && metadata.ogTitle.trim().length > 0) {
			rawSource = metadata.ogTitle.trim();
		} else if (metadata?.title && metadata.title.trim().length > 0) {
			rawSource = metadata.title.trim();
		} else {
			rawSource = fallbackTitleFromUrl(url);
		}

		// Normalización estricta: minúsculas, eliminación de acentos, eñes -> n
		let slug = rawSource
			.toLowerCase()
			.replace(/[ñÑ]/g, "n")
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");

		// Máx. 30 caracteres recortando por palabra completa
		if (slug.length > MAX_ALIAS_LENGTH) {
			const cut = slug.slice(0, MAX_ALIAS_LENGTH);
			const lastDash = cut.lastIndexOf("-");
			if (lastDash >= 10) {
				slug = cut.slice(0, lastDash);
			} else {
				slug = cut.replace(/-+$/, "");
			}
		}
		slug = slug.replace(/^-+|-+$/g, "");

		// Si queda vacío tras sanitizar, generar nanoid sin ambigüedad
		if (!slug || slug.length < 2) {
			slug = generateRandomSlug(7);
		}

		return resolveAliasCollision(slug, existingUrls);
	}

	// ============================================
	// FUNCIONALIDAD 2: DETECCIÓN AUTOMÁTICA DE CATEGORÍA
	// ============================================
	function detectCategory(url: string, metadata?: UrlMetadata | null): CategoryId {
		try {
			const parsed = new URL(url);
			const hostname = parsed.hostname.toLowerCase();
			const pathname = parsed.pathname.toLowerCase().replace(/[-_/.]+/g, " ");

			const scores: Partial<Record<CategoryId, number>> = {};

			const titleText = (metadata?.title || "").toLowerCase();
			const ogTitleText = (metadata?.ogTitle || "").toLowerCase();
			const descText = (metadata?.description || "").toLowerCase();

			for (const [catId, rule] of Object.entries(CATEGORY_RULES) as [
				Exclude<CategoryId, "all" | "work" | "personal" | "other">,
				CategoryRule
			][]) {
				let score = 0;

				// 1. Dominio exacto o subdominio (+15 pts)
				for (const d of rule.domains) {
					if (hostname === d || hostname.endsWith(`.${d}`) || hostname.includes(d)) {
						score += 15;
						break;
					}
				}

				// 2. Título y og:title (+4 pts por coincidencia)
				if (titleText || ogTitleText) {
					for (const kw of rule.keywords) {
						if (titleText.includes(kw) || ogTitleText.includes(kw)) {
							score += 4;
						}
					}
				}

				// 3. Meta description (+2 pts por coincidencia)
				if (descText) {
					for (const kw of rule.keywords) {
						if (descText.includes(kw)) {
							score += 2;
						}
					}
				}

				// 4. Ruta del URL (+3 pts por coincidencia)
				for (const kw of rule.keywords) {
					if (pathname.includes(kw)) {
						score += 3;
					}
				}

				if (score > 0) {
					scores[catId] = score;
				}
			}

			// Seleccionar la categoría con mayor puntuación combinada
			let bestCategory: CategoryId = "other";
			let maxScore = 0;
			for (const [cat, s] of Object.entries(scores) as [CategoryId, number][]) {
				if (s > maxScore) {
					maxScore = s;
					bestCategory = cat;
				}
			}

			return maxScore > 0 ? bestCategory : "other";
		} catch {
			return "other";
		}
	}

	function formatDate(isoDate: string): string {
		const date = new Date(isoDate);
		if (Number.isNaN(date.getTime())) return "Fecha inválida";
		const diffMs = Date.now() - date.getTime();
		if (diffMs < 0) return "Ahora";
		const diffMins = Math.floor(diffMs / 60_000);
		const diffHours = Math.floor(diffMs / 3_600_000);
		const diffDays = Math.floor(diffMs / 86_400_000);
		if (diffMins < 1) return "Ahora";
		if (diffMins < 60) return `Hace ${diffMins} min`;
		if (diffHours < 24) return `Hace ${diffHours} h`;
		if (diffDays === 1) return "Ayer";
		if (diffDays < 7) return `Hace ${diffDays} días`;
		return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
	}

	function generateId(): string {
		return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
	}

	// ============================================
	// Storage Helpers
	// ============================================
	function loadUrls(): ShortenedUrl[] {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return [];
			const data = JSON.parse(raw);
			if (!Array.isArray(data)) return [];
			return data
				.filter((u): u is ShortenedUrl => {
					return (
						typeof u === "object" &&
						u !== null &&
						typeof u.id === "string" &&
						typeof u.originalUrl === "string" &&
						typeof u.alias === "string"
					);
				})
				.map((u) => ({
					...u,
					shortUrl: u.shortUrl || u.originalUrl,
					category: (u.category as CategoryId) || "other",
					copyCount: typeof u.copyCount === "number" ? u.copyCount : 0,
					createdAt: u.createdAt || new Date().toISOString(),
					domainHue: typeof u.domainHue === "number" ? u.domainHue : getDomainHue(u.originalUrl),
				}))
				.slice(0, MAX_URLS);
		} catch (err) {
			console.warn("[UrlShortener] No se pudieron cargar URLs", err);
			return [];
		}
	}

	function saveUrls(list: ShortenedUrl[]): void {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
		} catch (err) {
			console.warn("[UrlShortener] No se pudieron guardar URLs", err);
		}
	}

	function loadSettings(): { sortBy: SortBy; viewMode: ViewMode } {
		try {
			const raw = localStorage.getItem(SETTINGS_KEY);
			if (!raw) return { sortBy: "date", viewMode: "list" };
			const data = JSON.parse(raw);
			return {
				sortBy: data.sortBy === "copies" || data.sortBy === "name" ? data.sortBy : "date",
				viewMode: data.viewMode === "grid" ? "grid" : "list",
			};
		} catch {
			return { sortBy: "date", viewMode: "list" };
		}
	}

	function saveSettings(sortBy: SortBy, viewMode: ViewMode): void {
		try {
			localStorage.setItem(SETTINGS_KEY, JSON.stringify({ sortBy, viewMode }));
		} catch {}
	}

	// ============================================
	// Estado Reactivo
	// ============================================
	let urls: ShortenedUrl[] = [];
	let inputUrl = "";
	let inputAlias = "";
	let inputCategory: CategoryId = "other";
	let searchQuery = "";
	let filterCategory: CategoryId = "all";
	let sortBy: SortBy = "date";
	let viewMode: ViewMode = "list";

	// UI State
	let showQR = false;
	let qrUrl = "";
	let qrAlias = "";
	let copiedId: string | null = null;
	let copiedAliasId: string | null = null;
	let showSuccess = false;
	let successMessage = "";
	let isDark = false;
	let isReady = false;
	let showOnboarding = false;
	let editingId: string | null = null;
	let editingAlias = "";
	let isShortening = false;

	let darkModeObserver: MutationObserver | null = null;
	const metadataCache = new Map<string, UrlMetadata>();
	let prefetchTimeout: ReturnType<typeof setTimeout> | null = null;

	// ============================================
	// Persistencia y Detección Reactiva
	// ============================================
	$: if (isReady) {
		saveSettings(sortBy, viewMode);
	}

	let categoryDetected = false;
	$: {
		if (inputUrl && !categoryDetected) {
			const normalized = normalizeUrl(inputUrl);
			if (isValidUrl(normalized)) {
				inputCategory = detectCategory(normalized);
				categoryDetected = true;

				if (prefetchTimeout) clearTimeout(prefetchTimeout);
				prefetchTimeout = setTimeout(async () => {
					if (!metadataCache.has(normalized)) {
						const meta = await fetchUrlMetadata(normalized);
						if (meta) {
							metadataCache.set(normalized, meta);
							if (inputCategory === "other") {
								const refined = detectCategory(normalized, meta);
								if (refined !== "other") inputCategory = refined;
							}
						}
					}
				}, 300);
			}
		} else if (!inputUrl) {
			categoryDetected = false;
			if (prefetchTimeout) clearTimeout(prefetchTimeout);
		}
	}

	// ============================================
	// Derivados
	// ============================================
	$: filteredUrls = (() => {
		const query = searchQuery.trim().toLowerCase();
		const filtered = urls.filter((u) => {
			const matchesSearch =
				!query ||
				u.originalUrl.toLowerCase().includes(query) ||
				u.alias.toLowerCase().includes(query);
			const matchesCategory = filterCategory === "all" || u.category === filterCategory;
			return matchesSearch && matchesCategory;
		});

		return [...filtered].sort((a, b) => {
			if (sortBy === "date") {
				return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			}
			if (sortBy === "copies") {
				return b.copyCount - a.copyCount;
			}
			return a.alias.localeCompare(b.alias);
		});
	})();

	$: totalUrls = urls.length;
	$: totalCopies = urls.reduce((sum, u) => sum + u.copyCount, 0);

	$: mostUsedCategory = ((): string => {
		if (urls.length === 0) return "";
		const counts: Partial<Record<CategoryId, number>> = {};
		for (const u of urls) {
			counts[u.category] = (counts[u.category] ?? 0) + 1;
		}
		let bestCat: CategoryId = "other";
		let bestCount = 0;
		for (const [cat, count] of Object.entries(counts) as [CategoryId, number][]) {
			if (count > bestCount) {
				bestCount = count;
				bestCat = cat;
			}
		}
		const cat = CATEGORY_MAP[bestCat];
		return cat ? `${cat.icon} ${cat.label}` : "🔗 Otros";
	})();

	// ============================================
	// Toast Helper
	// ============================================
	let toastTimer: ReturnType<typeof setTimeout> | null = null;
	let copyTimer: ReturnType<typeof setTimeout> | null = null;
	let copyAliasTimer: ReturnType<typeof setTimeout> | null = null;

	function showSuccessToast(message: string): void {
		successMessage = message;
		showSuccess = true;
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => {
			showSuccess = false;
			successMessage = "";
		}, TOAST_DURATION);
	}

	// ============================================
	// URL Shortening APIs
	// ============================================
	async function shortenWithCleanUri(longUrl: string): Promise<string> {
		const response = await fetch("https://cleanuri.com/api/v1/shorten", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: `url=${encodeURIComponent(longUrl)}`,
		});
		if (!response.ok) throw new Error(`CleanURI HTTP ${response.status}`);
		const data = await response.json();
		if (data.error) throw new Error(String(data.error));
		if (typeof data.result_url !== "string") throw new Error("Respuesta inválida");
		return data.result_url;
	}

	async function shortenWithSpooMe(longUrl: string): Promise<string> {
		const response = await fetch("https://spoo.me/", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
			},
			body: `url=${encodeURIComponent(longUrl)}`,
		});
		if (!response.ok) throw new Error(`spoo.me HTTP ${response.status}`);
		const data = await response.json();
		if (typeof data.short_url !== "string") throw new Error("Respuesta inválida");
		return data.short_url;
	}

	async function shortenWithShrtcode(longUrl: string): Promise<string> {
		const response = await fetch(
			`https://api.shrtco.de/v2/shorten?url=${encodeURIComponent(longUrl)}`,
		);
		if (!response.ok) throw new Error(`shrtco.de HTTP ${response.status}`);
		const data = await response.json();
		if (!data.ok || !data.result) throw new Error(data.error || "Falló");
		return data.result.full_short_link;
	}

	async function shortenUrl(longUrl: string): Promise<string> {
		const apis = [
			{ name: "CleanURI", fn: shortenWithCleanUri },
			{ name: "spoo.me", fn: shortenWithSpooMe },
			{ name: "shrtco.de", fn: shortenWithShrtcode },
		];

		for (const api of apis) {
			try {
				const result = await api.fn(longUrl);
				if (result && result !== longUrl && /^https?:\/\//.test(result)) {
					return result;
				}
			} catch (err) {
				console.warn(`[UrlShortener] ${api.name} falló`, err);
			}
		}
		throw new Error("Todos los servicios no disponibles");
	}

	// ============================================
	// Acciones UI
	// ============================================
	async function addUrl(): Promise<void> {
		const trimmedUrl = inputUrl.trim();
		if (!trimmedUrl) return;

		if (trimmedUrl.length > MAX_INPUT_LENGTH) {
			showSuccessToast("⚠️ URL demasiado larga");
			return;
		}

		const normalized = normalizeUrl(trimmedUrl);
		if (!isValidUrl(normalized)) {
			showSuccessToast("⚠️ URL inválida");
			return;
		}

		const existing = urls.find((u) => u.originalUrl === normalized);
		if (existing) {
			await copyToClipboard(existing.shortUrl);
			showSuccessToast(`✓ Copiado (alias: #${existing.alias})`);
			return;
		}

		if (urls.length >= MAX_URLS) {
			showSuccessToast(`⚠️ Máximo ${MAX_URLS} URLs`);
			return;
		}

		let alias = inputAlias.trim().toLowerCase();
		if (alias) {
			if (!isValidAlias(alias)) {
				showSuccessToast("⚠️ Alias inválido (solo a-z, 0-9 y guiones intermedios)");
				return;
			}
			if (urls.some((u) => u.alias.toLowerCase() === alias)) {
				showSuccessToast("⚠️ Alias ya existe");
				return;
			}
		}

		isShortening = true;
		try {
			let metadata: UrlMetadata | null = metadataCache.get(normalized) || null;
			if (!alias || inputCategory === "other") {
				if (!metadata) {
					metadata = await fetchUrlMetadata(normalized);
					if (metadata) metadataCache.set(normalized, metadata);
				}
				if (!alias) {
					alias = generateSmartAlias(normalized, metadata, urls);
				}
				if (inputCategory === "other" && metadata) {
					const refined = detectCategory(normalized, metadata);
					if (refined !== "other") inputCategory = refined;
				}
			}

			const shortUrl = await shortenUrl(normalized);
			const newUrl: ShortenedUrl = {
				id: generateId(),
				originalUrl: normalized,
				shortUrl,
				alias,
				createdAt: new Date().toISOString(),
				copyCount: 0,
				category: inputCategory,
				domainHue: getDomainHue(normalized),
			};
			urls = [newUrl, ...urls];
			saveUrls(urls);
			inputUrl = "";
			inputAlias = "";
			inputCategory = "other";
			categoryDetected = false;
			showSuccessToast("✓ URL acortada");
		} catch (err) {
			console.warn("[UrlShortener] Acortamiento falló, guardando sin acortar", err);
			if (!alias) {
				const metadata = metadataCache.get(normalized) || null;
				alias = generateSmartAlias(normalized, metadata, urls);
			}
			const newUrl: ShortenedUrl = {
				id: generateId(),
				originalUrl: normalized,
				shortUrl: normalized,
				alias,
				createdAt: new Date().toISOString(),
				copyCount: 0,
				category: inputCategory,
				domainHue: getDomainHue(normalized),
			};
			urls = [newUrl, ...urls];
			saveUrls(urls);
			inputUrl = "";
			inputAlias = "";
			inputCategory = "other";
			categoryDetected = false;
			showSuccessToast("⚠️ Guardado (servicios no disponibles)");
		} finally {
			isShortening = false;
		}
	}

	async function copyToClipboard(text: string): Promise<boolean> {
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
				return true;
			}
		} catch {}
		try {
			const ta = document.createElement("textarea");
			ta.value = text;
			ta.setAttribute("readonly", "");
			ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;";
			document.body.appendChild(ta);
			ta.focus();
			ta.select();
			const ok = document.execCommand("copy");
			document.body.removeChild(ta);
			return ok;
		} catch {
			return false;
		}
	}

	async function copyUrl(urlEntry: ShortenedUrl): Promise<void> {
		const ok = await copyToClipboard(urlEntry.shortUrl);
		if (!ok) {
			showSuccessToast("⚠️ No se pudo copiar");
			return;
		}
		urls = urls.map((u) =>
			u.id === urlEntry.id ? { ...u, copyCount: u.copyCount + 1 } : u,
		);
		saveUrls(urls);
		copiedId = urlEntry.id;
		if (copyTimer) clearTimeout(copyTimer);
		copyTimer = setTimeout(() => {
			copiedId = null;
		}, COPY_FEEDBACK_DURATION);
	}

	async function copyAlias(urlEntry: ShortenedUrl): Promise<void> {
		const ok = await copyToClipboard(`#${urlEntry.alias}`);
		if (!ok) return;
		copiedAliasId = urlEntry.id;
		if (copyAliasTimer) clearTimeout(copyAliasTimer);
		copyAliasTimer = setTimeout(() => {
			copiedAliasId = null;
		}, COPY_FEEDBACK_DURATION);
	}

	function deleteUrl(id: string): void {
		const url = urls.find((u) => u.id === id);
		if (!url) return;
		if (!confirm(`¿Eliminar el alias #${url.alias}?`)) return;
		urls = urls.filter((u) => u.id !== id);
		saveUrls(urls);
		showSuccessToast("🗑️ Eliminado");
	}

	function showQRCode(url: ShortenedUrl): void {
		qrUrl = url.originalUrl;
		qrAlias = url.alias;
		showQR = true;
	}

	function closeQR(): void {
		showQR = false;
		qrUrl = "";
		qrAlias = "";
	}

	function startEditAlias(url: ShortenedUrl): void {
		editingId = url.id;
		editingAlias = url.alias;
	}

	function saveEditAlias(): void {
		if (!editingId) return;
		const newAlias = editingAlias.trim().toLowerCase();
		if (!newAlias || !isValidAlias(newAlias)) {
			showSuccessToast("⚠️ Alias inválido (solo a-z, 0-9 y guiones intermedios)");
			return;
		}
		if (urls.some((u) => u.alias.toLowerCase() === newAlias && u.id !== editingId)) {
			showSuccessToast("⚠️ Alias ya existe");
			return;
		}
		urls = urls.map((u) => (u.id === editingId ? { ...u, alias: newAlias } : u));
		saveUrls(urls);
		editingId = null;
		editingAlias = "";
		showSuccessToast("✓ Alias actualizado");
	}

	function cancelEditAlias(): void {
		editingId = null;
		editingAlias = "";
	}

	function exportUrls(): void {
		try {
			const dataStr = JSON.stringify(urls, null, 2);
			const blob = new Blob([dataStr], { type: "application/json" });
			const objUrl = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = objUrl;
			link.download = `urls-${new Date().toISOString().split("T")[0]}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(objUrl);
			showSuccessToast("📤 Exportado");
		} catch {
			showSuccessToast("⚠️ Error al exportar");
		}
	}

	function importUrls(): void {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "application/json,.json";
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const result = e.target?.result;
					if (typeof result !== "string") {
						showSuccessToast("⚠️ Archivo inválido");
						return;
					}
					const imported = JSON.parse(result);
					if (!Array.isArray(imported)) {
						showSuccessToast("⚠️ Formato inválido");
						return;
					}
					const valid = imported.filter(
						(u): u is ShortenedUrl =>
							typeof u === "object" &&
							u !== null &&
							typeof u.id === "string" &&
							typeof u.originalUrl === "string" &&
							typeof u.alias === "string",
					);
					if (valid.length === 0) {
						showSuccessToast("⚠️ No hay URLs válidas");
						return;
					}
					urls = valid.slice(0, MAX_URLS);
					saveUrls(urls);
					showSuccessToast(`📥 ${urls.length} URLs importados`);
				} catch {
					showSuccessToast("⚠️ Error al importar");
				}
			};
			reader.readAsText(file);
		};
		input.click();
	}

	function closeOnboarding(): void {
		showOnboarding = false;
		try {
			localStorage.setItem(ONBOARDING_KEY, "true");
		} catch {}
	}

	// ============================================
	// Atajos de teclado
	// ============================================
	function onKey(event: KeyboardEvent): void {
		const target = event.target as HTMLElement;
		const inField =
			target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA" ||
			target.tagName === "SELECT" ||
			target.isContentEditable;

		if (event.key === "Escape") {
			if (showQR) {
				closeQR();
				return;
			}
			if (showOnboarding) {
				closeOnboarding();
				return;
			}
			if (editingId) {
				cancelEditAlias();
				return;
			}
		}

		if ((event.ctrlKey || event.metaKey) && event.key === "e" && !inField) {
			event.preventDefault();
			exportUrls();
			return;
		}

		if ((event.ctrlKey || event.metaKey) && event.key === "k" && !inField) {
			event.preventDefault();
			const searchInput = document.querySelector<HTMLInputElement>("input[type='search'].input-search");
			searchInput?.focus();
		}
	}

	// ============================================
	// QR Modal Focus Trap
	// ============================================
	let qrCard: HTMLDivElement;

	function handleQRKeydown(event: KeyboardEvent): void {
		if (event.key !== "Tab" || !qrCard) return;
		const focusable = qrCard.querySelectorAll<HTMLElement>(
			"button, a, input, [tabindex]:not([tabindex='-1'])",
		);
		if (focusable.length === 0) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	$: if (showQR && qrCard) {
		queueMicrotask(() => {
			const firstButton = qrCard.querySelector<HTMLElement>("button");
			firstButton?.focus();
		});
	}

	// ============================================
	// Ciclo de Vida
	// ============================================
	onMount(() => {
		urls = loadUrls();
		const settings = loadSettings();
		sortBy = settings.sortBy;
		viewMode = settings.viewMode;

		const htmlEl = document.documentElement;
		isDark = htmlEl.classList.contains("dark");
		darkModeObserver = new MutationObserver(() => {
			isDark = htmlEl.classList.contains("dark");
		});
		darkModeObserver.observe(htmlEl, { attributes: true, attributeFilter: ["class"] });

		document.addEventListener("keydown", onKey);

		try {
			const hasSeen = localStorage.getItem(ONBOARDING_KEY);
			if (!hasSeen && urls.length === 0) showOnboarding = true;
		} catch {}

		isReady = true;
	});

	onDestroy(() => {
		document.removeEventListener("keydown", onKey);
		if (darkModeObserver) {
			darkModeObserver.disconnect();
			darkModeObserver = null;
		}
		if (toastTimer) clearTimeout(toastTimer);
		if (copyTimer) clearTimeout(copyTimer);
		if (copyAliasTimer) clearTimeout(copyAliasTimer);
		if (prefetchTimeout) clearTimeout(prefetchTimeout);
	});
</script>

{#if isReady}
	<div class="url-shortener-wrapper" class:dark={isDark}>
		<!-- ============================================
         Onboarding
         ============================================ -->
		{#if showOnboarding}
			<div
				class="url-shortener-onboarding-overlay"
				on:click|self={closeOnboarding}
				role="presentation"
			>
				<div
					class="url-shortener-onboarding-card"
					role="dialog"
					aria-modal="true"
					aria-labelledby="onboarding-title"
				>
					<div class="onboarding-step">
						<div class="step-icon" aria-hidden="true">🔗</div>
						<h3 id="onboarding-title">Acorta tus URLs</h3>
						<p>Pega cualquier URL largo y crea un alias personalizado</p>
					</div>
					<div class="onboarding-step">
						<div class="step-icon" aria-hidden="true">📊</div>
						<h3>Organiza y rastrea</h3>
						<p>Historial completo con estadísticas de uso</p>
					</div>
					<div class="onboarding-step">
						<div class="step-icon" aria-hidden="true">📱</div>
						<h3>Genera QR Codes</h3>
						<p>Crea códigos QR al instante</p>
					</div>
					<button class="btn-onboarding" on:click={closeOnboarding}>
						¡Comenzar!
					</button>
				</div>
			</div>
		{/if}

		<!-- ============================================
         QR Modal
         ============================================ -->
		{#if showQR}
			<div
				class="url-shortener-qr-overlay"
				on:click={closeQR}
				on:keydown={handleQRKeydown}
				role="presentation"
			>
				<div
					class="url-shortener-qr-card"
					bind:this={qrCard}
					on:click|stopPropagation
					role="dialog"
					aria-modal="true"
					aria-labelledby="qr-title"
				>
					<h3 id="qr-title">QR Code: #{qrAlias}</h3>
					<div class="qr-container">
						<img
							src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
							alt={`Código QR para ${qrAlias}`}
							width="200"
							height="200"
							loading="lazy"
						/>
					</div>
					<p class="qr-url">{qrUrl}</p>
					<div class="qr-actions">
						<button type="button" class="btn-close-qr" on:click={closeQR}>
							Cerrar
						</button>
						<a
							class="btn-download-qr"
							href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}`}
							download={`qr-${qrAlias}.png`}
							target="_blank"
							rel="noopener noreferrer"
						>
							💾 Descargar QR
						</a>
					</div>
				</div>
			</div>
		{/if}

		<!-- ============================================
         Toast
         ============================================ -->
		{#if showSuccess}
			<div class="toast-success" role="status" aria-live="polite">
				<span>{successMessage}</span>
			</div>
		{/if}

		<!-- ============================================
         Header
         ============================================ -->
		<header class="url-shortener-header">
			<div class="header-info">
				<h2 class="url-shortener-title">Acortador de URLs</h2>
				<p class="url-shortener-subtitle">Organiza, acorta y gestiona tus enlaces favoritos</p>
				<div class="stats-row" aria-live="polite">
					<span class="stat-item">📊 {totalUrls} URLs</span>
					<span class="stat-item">📋 {totalCopies} copias</span>
					{#if mostUsedCategory}
						<span class="stat-item">⭐ {mostUsedCategory}</span>
					{/if}
				</div>
			</div>
			<div class="header-actions">
				<button type="button" class="btn-action" on:click={exportUrls} title="Exportar URLs">
					📤 Exportar
				</button>
				<button type="button" class="btn-action" on:click={importUrls} title="Importar URLs">
					📥 Importar
				</button>
			</div>
		</header>

		<!-- ============================================
         Input Section
         ============================================ -->
		<section class="input-section" aria-label="Acortar nueva URL">
			<div class="input-row">
				<input
					type="text"
					bind:value={inputUrl}
					placeholder="Pega tu URL largo aquí..."
					class="input-url"
					aria-label="URL a acortar"
					maxlength={MAX_INPUT_LENGTH}
					on:keydown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							addUrl();
						}
					}}
				/>
				<input
					type="text"
					bind:value={inputAlias}
					placeholder="Alias (opcional)"
					class="input-alias"
					aria-label="Alias personalizado"
					maxlength={MAX_ALIAS_LENGTH}
					on:keydown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							addUrl();
						}
					}}
				/>
				<select
					bind:value={inputCategory}
					class="select-category"
					aria-label="Categoría"
				>
					{#each CATEGORIES.filter((c) => c.id !== "all") as cat (cat.id)}
						<option value={cat.id}>{cat.icon} {cat.label}</option>
					{/each}
				</select>
				<button
					type="button"
					class="btn-add"
					on:click={addUrl}
					disabled={isShortening || !inputUrl.trim()}
				>
					{isShortening ? "⏳ Acortando..." : "🔗 Acortar"}
				</button>
			</div>
			<p class="input-hint">
				Sin alias, se genera uno automático. Categoría detectada automáticamente.
			</p>
		</section>

		<!-- ============================================
         Filtros
         ============================================ -->
		{#if urls.length > 0}
			<nav class="category-filter" aria-label="Filtro por categoría">
				{#each CATEGORIES as cat (cat.id)}
					<button
						type="button"
						class="btn-category"
						class:active={filterCategory === cat.id}
						on:click={() => (filterCategory = cat.id)}
						aria-pressed={filterCategory === cat.id}
					>
						{cat.icon} {cat.label}
					</button>
				{/each}
			</nav>
		{/if}

		<div class="filter-section">
			<input
				type="search"
				bind:value={searchQuery}
				placeholder="🔍 Buscar por alias o URL..."
				class="input-search"
				aria-label="Buscar URLs"
			/>
			<div class="sort-buttons" role="group" aria-label="Ordenar y vista">
				<button
					type="button"
					class="btn-sort"
					class:active={sortBy === "date"}
					on:click={() => (sortBy = "date")}
					aria-pressed={sortBy === "date"}
				>
					📅 Fecha
				</button>
				<button
					type="button"
					class="btn-sort"
					class:active={sortBy === "copies"}
					on:click={() => (sortBy = "copies")}
					aria-pressed={sortBy === "copies"}
				>
					📊 Copias
				</button>
				<button
					type="button"
					class="btn-sort"
					class:active={sortBy === "name"}
					on:click={() => (sortBy = "name")}
					aria-pressed={sortBy === "name"}
				>
					🔤 Nombre
				</button>
				<button
					type="button"
					class="btn-sort"
					on:click={() => (viewMode = viewMode === "list" ? "grid" : "list")}
					title="Cambiar vista"
					aria-label="Cambiar entre vista lista y grid"
				>
					{viewMode === "list" ? "🔲 Grid" : "📋 Lista"}
				</button>
			</div>
		</div>

		<!-- ============================================
         Info section (solo si no hay URLs)
         ============================================ -->
		{#if urls.length === 0 && !searchQuery}
			<section class="info-section" aria-label="Cómo funciona">
				<h3>¿Cómo funciona?</h3>
				<div class="info-grid">
					<div class="info-item">
						<span class="info-icon" aria-hidden="true">📋</span>
						<div>
							<strong>Guarda y organiza</strong>
							<p>Almacena tus enlaces favoritos con alias fáciles de recordar</p>
						</div>
					</div>
					<div class="info-item">
						<span class="info-icon" aria-hidden="true">📱</span>
						<div>
							<strong>Genera QR Codes</strong>
							<p>Crea códigos QR al instante para compartir</p>
						</div>
					</div>
					<div class="info-item">
						<span class="info-icon" aria-hidden="true">📊</span>
						<div>
							<strong>Rastrea tu uso</strong>
							<p>Mira cuántas veces has copiado cada enlace</p>
						</div>
					</div>
					<div class="info-item">
						<span class="info-icon" aria-hidden="true">💾</span>
						<div>
							<strong>Exporta todo</strong>
							<p>Descarga o importa tu biblioteca completa</p>
						</div>
					</div>
				</div>
			</section>
		{/if}

		<!-- ============================================
         Lista de URLs
         ============================================ -->
		<ul class="urls-list" class:view-grid={viewMode === "grid"} aria-label="URLs guardados">
			{#if filteredUrls.length === 0}
				<li class="empty-state">
					{#if searchQuery}
						<p>No se encontraron URLs con "{searchQuery}"</p>
					{:else if filterCategory !== "all"}
						<p>No hay URLs en esta categoría</p>
					{:else}
						<p>🔗 No tienes URLs guardados aún</p>
						<p class="empty-hint">Pega un URL arriba para comenzar</p>
					{/if}
				</li>
			{:else}
				{#each filteredUrls as url (url.id)}
					<li class="url-card" style:--hue={url.domainHue ?? 200}>
						<div class="url-card-header">
							{#if editingId === url.id}
								<input
									type="text"
									bind:value={editingAlias}
									class="input-edit-alias"
									aria-label="Editar alias"
									maxlength={MAX_ALIAS_LENGTH}
									on:keydown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											saveEditAlias();
										}
										if (e.key === "Escape") cancelEditAlias();
									}}
									autofocus
								/>
								<div class="edit-actions">
									<button
										type="button"
										class="btn-icon btn-save"
										on:click={saveEditAlias}
										aria-label="Guardar alias"
									>
										✓
									</button>
									<button
										type="button"
										class="btn-icon btn-cancel"
										on:click={cancelEditAlias}
										aria-label="Cancelar edición"
									>
										✕
									</button>
								</div>
							{:else}
								<div class="url-alias-row">
									<div class="url-favicon-globe" aria-hidden="true">
										<svg
											class="globe-icon"
											viewBox="0 0 24 24"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<circle class="globe-outer-ring" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" />
											<path class="globe-meridian globe-m1" d="M12 2a8 8 0 0 1 0 20 8 8 0 0 1 0-20" stroke="currentColor" stroke-width="1.2" />
											<path class="globe-meridian globe-m2" d="M12 2a6 6 0 0 1 0 20 6 6 0 0 1 0-20" stroke="currentColor" stroke-width="1" />
											<path class="globe-latitude globe-lat1" d="M2 12h20" stroke="currentColor" stroke-width="1.2" />
											<path class="globe-latitude globe-lat2" d="M4 8h16" stroke="currentColor" stroke-width="1" />
											<path class="globe-latitude globe-lat3" d="M4 16h16" stroke="currentColor" stroke-width="1" />
											<circle class="globe-dot globe-dot1" cx="12" cy="4" r="1.2" fill="currentColor" />
											<circle class="globe-dot globe-dot2" cx="18" cy="12" r="1.2" fill="currentColor" />
											<circle class="globe-dot globe-dot3" cx="12" cy="20" r="1.2" fill="currentColor" />
											<circle class="globe-dot globe-dot4" cx="6" cy="12" r="1.2" fill="currentColor" />
										</svg>
									</div>
									<div class="url-alias">#{url.alias}</div>
									<span class="url-category-badge" aria-hidden="true">
										{CATEGORY_MAP[url.category]?.icon ?? "🔗"}
									</span>
								</div>
								<div class="url-meta">
									<span>{formatDate(url.createdAt)}</span>
									<span class="copy-count">{url.copyCount} copias</span>
								</div>
							{/if}
						</div>
						<div class="short-url-display">
							<span class="short-url-text" title={url.shortUrl}>{url.shortUrl}</span>
						</div>
						<div class="original-url-ref">
							<span class="original-url-text">Original: {url.originalUrl}</span>
						</div>
						<div class="url-card-actions">
							<button
								type="button"
								class="btn-card-action btn-copy-main"
								class:copied={copiedId === url.id}
								on:click={() => copyUrl(url)}
							>
								{copiedId === url.id ? "✓ Copiado" : "📋 Copiar"}
							</button>
							<button
								type="button"
								class="btn-card-action"
								class:copied={copiedAliasId === url.id}
								on:click={() => copyAlias(url)}
								aria-label="Copiar alias"
								title="Copiar #alias"
							>
								{copiedAliasId === url.id ? "✓" : "🏷️"}
							</button>
							<button
								type="button"
								class="btn-card-action"
								on:click={() => showQRCode(url)}
								aria-label="Ver QR code"
								title="Ver QR"
							>
								📱
							</button>
							<button
								type="button"
								class="btn-card-action"
								on:click={() => startEditAlias(url)}
								aria-label="Editar alias"
								title="Editar"
							>
								✏️
							</button>
							<button
								type="button"
								class="btn-card-action btn-delete"
								on:click={() => deleteUrl(url.id)}
								aria-label="Eliminar"
								title="Eliminar"
							>
								🗑️
							</button>
						</div>
					</li>
				{/each}
			{/if}
		</ul>

		<!-- ============================================
         Footer
         ============================================ -->
		<footer class="url-shortener-footer">
			<div class="shortcuts-info">
				<span><kbd>Enter</kbd> Acortar</span>
				<span><kbd>Ctrl</kbd>+<kbd>K</kbd> Buscar</span>
				<span><kbd>Ctrl</kbd>+<kbd>E</kbd> Exportar</span>
				<span><kbd>Esc</kbd> Cerrar</span>
			</div>
			<div class="footer-info">
				<span>{totalUrls}/{MAX_URLS} URLs</span>
				<span class="ad-free-badge">🔒 Sin publicidad · Enlaces limpios</span>
			</div>
		</footer>
	</div>
{/if}

<style>
	.url-shortener-wrapper {
		--hue: 250;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		position: relative;
		color: #0f172a;
		font-family: inherit;
	}

	:global(.dark) .url-shortener-wrapper,
	.url-shortener-wrapper.dark {
		color: #e2e8f0;
	}

	/* ============================================
      Header
      ============================================ */
	.url-shortener-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.header-info {
		min-width: 0;
	}

	.url-shortener-title {
		font-size: 1.85rem;
		font-weight: 700;
		background: linear-gradient(135deg, oklch(0.7 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-bottom: 0.25rem;
		line-height: 1.1;
	}

	.url-shortener-subtitle {
		color: #475569;
		font-size: 0.95rem;
		line-height: 1.4;
		margin-bottom: 0.5rem;
	}

	:global(.dark) .url-shortener-subtitle,
	.dark .url-shortener-subtitle {
		color: #94a3b8;
	}

	.stats-row {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		font-size: 0.85rem;
	}

	.stat-item {
		color: #64748b;
		font-weight: 600;
	}

	:global(.dark) .stat-item,
	.dark .stat-item {
		color: #94a3b8;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.btn-action {
		padding: 0.5rem 1rem;
		background: oklch(0.97 0.01 var(--hue));
		color: oklch(0.55 0.12 var(--hue));
		border: 1.5px solid oklch(0.85 0.05 var(--hue) / 0.5);
		border-radius: 0.75rem;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
		transition:
			background-color var(--transition-normal, 200ms ease),
			color var(--transition-normal, 200ms ease),
			border-color var(--transition-normal, 200ms ease),
			transform var(--transition-fast, 150ms ease);
	}

	:global(.dark) .btn-action,
	.dark .btn-action {
		background: oklch(0.22 0.02 var(--hue));
		color: oklch(0.75 0.14 var(--hue));
		border-color: oklch(0.35 0.04 var(--hue));
	}

	.btn-action:hover {
		background: oklch(0.7 0.14 var(--hue));
		color: white;
		border-color: oklch(0.7 0.14 var(--hue));
		transform: translateY(-1px);
	}

	.btn-action:active {
		transform: translateY(0);
	}

	.btn-action:focus-visible {
		outline: 2px solid oklch(0.6 0.18 var(--hue));
		outline-offset: 2px;
	}

	/* ============================================
      Input section
      ============================================ */
	.input-section {
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-radius: 1.25rem;
		padding: 1.25rem;
		border: 1px solid rgba(0, 0, 0, 0.05);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
	}

	:global(.dark) .input-section,
	.dark .input-section {
		background: rgba(30, 41, 59, 0.6);
		border-color: rgba(148, 163, 184, 0.15);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
	}

	.input-row {
		display: grid;
		grid-template-columns: 1fr auto auto auto;
		gap: 0.75rem;
	}

	@media (max-width: 768px) {
		.input-row {
			grid-template-columns: 1fr;
		}
	}

	.input-url,
	.input-alias,
	.select-category,
	.input-search {
		padding: 0.7rem 1rem;
		border: 2px solid oklch(0.9 0.02 var(--hue));
		border-radius: 0.75rem;
		font-size: 0.95rem;
		background: white;
		color: #0f172a;
		transition: border-color 200ms ease, box-shadow 200ms ease;
		min-width: 0;
	}

	:global(.dark) .input-url,
	:global(.dark) .input-alias,
	:global(.dark) .select-category,
	:global(.dark) .input-search,
	.dark .input-url,
	.dark .input-alias,
	.dark .select-category,
	.dark .input-search {
		background: oklch(0.22 0.02 var(--hue));
		color: #e2e8f0;
		border-color: oklch(0.35 0.03 var(--hue));
	}

	.input-url:focus,
	.input-alias:focus,
	.select-category:focus,
	.input-search:focus {
		outline: none;
		border-color: oklch(0.7 0.14 var(--hue));
		box-shadow: 0 0 0 3px oklch(0.7 0.14 var(--hue) / 0.12);
	}

	.input-alias {
		min-width: 140px;
	}

	.select-category {
		min-width: 130px;
		cursor: pointer;
	}

	.btn-add {
		padding: 0.7rem 1.5rem;
		background: linear-gradient(135deg, oklch(0.7 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		color: white;
		border: none;
		border-radius: 0.75rem;
		font-weight: 700;
		font-size: 0.95rem;
		cursor: pointer;
		transition: transform 200ms ease, box-shadow 200ms ease, opacity 200ms ease;
		white-space: nowrap;
		box-shadow: 0 4px 12px oklch(0.7 0.14 var(--hue) / 0.3);
	}

	.btn-add:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px oklch(0.7 0.14 var(--hue) / 0.4);
	}

	.btn-add:active:not(:disabled) {
		transform: translateY(0);
	}

	.btn-add:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		animation: pulse 2s ease-in-out infinite;
	}

	.btn-add:focus-visible {
		outline: 2px solid oklch(0.6 0.18 var(--hue));
		outline-offset: 2px;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 0.7; }
	}

	.input-hint {
		margin-top: 0.75rem;
		font-size: 0.85rem;
		color: #64748b;
	}

	:global(.dark) .input-hint,
	.dark .input-hint {
		color: #94a3b8;
	}

	/* ============================================
      Category filter
      ============================================ */
	.category-filter {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		padding: 0.75rem;
		background: oklch(0.98 0.01 var(--hue));
		border-radius: 0.75rem;
		border: 1px solid oklch(0.92 0.02 var(--hue));
	}

	:global(.dark) .category-filter,
	.dark .category-filter {
		background: oklch(0.2 0.02 var(--hue));
		border-color: oklch(0.3 0.03 var(--hue));
	}

	.btn-category {
		padding: 0.5rem 0.9rem;
		background: white;
		color: #475569;
		border: 1.5px solid oklch(0.9 0.02 var(--hue));
		border-radius: 0.75rem;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease, transform 150ms ease, box-shadow 200ms ease;
	}

	:global(.dark) .btn-category,
	.dark .btn-category {
		background: oklch(0.22 0.02 var(--hue));
		color: #cbd5e1;
		border-color: oklch(0.32 0.03 var(--hue));
	}

	.btn-category:hover {
		background: oklch(0.95 0.03 var(--hue));
		border-color: oklch(0.7 0.12 var(--hue) / 0.4);
		color: oklch(0.55 0.14 var(--hue));
		transform: translateY(-1px);
	}

	:global(.dark) .btn-category:hover,
	.dark .btn-category:hover {
		background: oklch(0.28 0.03 var(--hue));
		color: oklch(0.75 0.14 var(--hue));
	}

	.btn-category.active {
		background: linear-gradient(135deg, oklch(0.7 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		color: white;
		border-color: transparent;
		box-shadow: 0 4px 12px oklch(0.7 0.14 var(--hue) / 0.35);
	}

	.btn-category.active:hover {
		transform: translateY(-1px);
	}

	.btn-category:focus-visible {
		outline: 2px solid oklch(0.6 0.18 var(--hue));
		outline-offset: 2px;
	}

	/* ============================================
      Filter section
      ============================================ */
	.filter-section {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.input-search {
		flex: 1;
		min-width: 200px;
	}

	.sort-buttons {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.btn-sort {
		padding: 0.5rem 0.9rem;
		background: white;
		color: #475569;
		border: 1.5px solid oklch(0.9 0.02 var(--hue));
		border-radius: 0.625rem;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease, transform 150ms ease, box-shadow 200ms ease;
		white-space: nowrap;
	}

	:global(.dark) .btn-sort,
	.dark .btn-sort {
		background: oklch(0.22 0.02 var(--hue));
		color: #cbd5e1;
		border-color: oklch(0.32 0.03 var(--hue));
	}

	.btn-sort:hover {
		background: oklch(0.95 0.03 var(--hue));
		border-color: oklch(0.7 0.12 var(--hue) / 0.4);
		color: oklch(0.55 0.14 var(--hue));
		transform: translateY(-1px);
	}

	:global(.dark) .btn-sort:hover,
	.dark .btn-sort:hover {
		background: oklch(0.28 0.03 var(--hue));
		color: oklch(0.75 0.14 var(--hue));
	}

	.btn-sort.active {
		background: oklch(0.94 0.04 var(--hue));
		border-color: oklch(0.7 0.14 var(--hue));
		color: oklch(0.5 0.16 var(--hue));
	}

	:global(.dark) .btn-sort.active,
	.dark .btn-sort.active {
		background: oklch(0.28 0.05 var(--hue));
		border-color: oklch(0.65 0.14 var(--hue));
		color: oklch(0.78 0.14 var(--hue));
	}

	.btn-sort:focus-visible {
		outline: 2px solid oklch(0.6 0.18 var(--hue));
		outline-offset: 2px;
	}

	/* ============================================
      URLs list
      ============================================ */
	.urls-list {
		display: grid;
		gap: 0.85rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.urls-list.view-grid {
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
	}

	@media (max-width: 768px) {
		.urls-list.view-grid {
			grid-template-columns: 1fr;
		}
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: #94a3b8;
		grid-column: 1 / -1;
		list-style: none;
	}

	.empty-state p {
		font-size: 1.05rem;
		margin-bottom: 0.5rem;
	}

	.empty-hint {
		font-size: 0.85rem;
		opacity: 0.8;
	}

	/* ============================================
      URL card
      ============================================ */
	.url-card {
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-radius: 1.25rem;
		padding: 1.15rem;
		border: 1px solid rgba(0, 0, 0, 0.05);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
		transition: transform 200ms ease, box-shadow 200ms ease;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	:global(.dark) .url-card,
	.dark .url-card {
		background: rgba(30, 41, 59, 0.6);
		border-color: rgba(148, 163, 184, 0.15);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
	}

	.url-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
	}

	:global(.dark) .url-card:hover,
	.dark .url-card:hover {
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
	}

	.url-card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.url-alias-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
	}

	.url-favicon-globe {
		position: relative;
		width: 38px;
		height: 38px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border-radius: 10px;
		background: linear-gradient(
			135deg,
			hsla(var(--hue, 200), 70%, 55%, 0.14),
			hsla(var(--hue, 200), 65%, 50%, 0.06)
		);
		border: 1.5px solid hsla(var(--hue, 200), 70%, 60%, 0.3);
		transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
		transform: translateZ(0);
	}

	.url-favicon-globe:hover {
		transform: translateZ(0) scale(1.05);
		border-color: hsla(var(--hue, 200), 70%, 60%, 0.5);
	}

	:global(.dark) .url-favicon-globe,
	.dark .url-favicon-globe {
		background: linear-gradient(
			135deg,
			hsla(var(--hue, 200), 70%, 45%, 0.2),
			hsla(var(--hue, 200), 65%, 40%, 0.1)
		);
		border-color: hsla(var(--hue, 200), 70%, 50%, 0.4);
	}

	.globe-icon {
		width: 22px;
		height: 22px;
		color: hsl(var(--hue, 200), 70%, 50%);
		filter: drop-shadow(0 1px 2px hsla(var(--hue, 200), 70%, 30%, 0.3));
		animation: globeSpin 18s linear infinite;
		transform-origin: center;
	}

	:global(.dark) .globe-icon,
	.dark .globe-icon {
		color: hsl(var(--hue, 200), 75%, 65%);
	}

	@media (prefers-reduced-motion: reduce) {
		.globe-icon {
			animation: none;
		}
		.globe-outer-ring,
		.globe-meridian,
		.globe-latitude,
		.globe-dot {
			animation: none !important;
		}
	}

	@keyframes globeSpin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.globe-outer-ring {
		animation: ringPulse 4s ease-in-out infinite;
		transform-origin: center;
	}

	@keyframes ringPulse {
		0%, 100% { stroke-opacity: 0.8; }
		50% { stroke-opacity: 0.4; }
	}

	.globe-meridian,
	.globe-latitude {
		stroke-dasharray: 60;
	}

	.globe-m1 { animation: meridianFlow 5s ease-in-out infinite; }
	.globe-m2 { animation: meridianFlow 5s ease-in-out infinite 1s; }
	.globe-lat1 { animation: latitudeExpand 4s ease-in-out infinite; }
	.globe-lat2 { animation: latitudeExpand 4s ease-in-out infinite 0.8s; }
	.globe-lat3 { animation: latitudeExpand 4s ease-in-out infinite 1.6s; }

	@keyframes meridianFlow {
		0%, 100% { stroke-opacity: 0.3; }
		50% { stroke-opacity: 0.85; }
	}

	@keyframes latitudeExpand {
		0%, 100% { stroke-opacity: 0.3; }
		50% { stroke-opacity: 0.9; }
	}

	.globe-dot {
		animation: dotPulse 3s ease-in-out infinite;
		transform-origin: center;
	}

	.globe-dot1 { animation-delay: 0s; }
	.globe-dot2 { animation-delay: 0.75s; }
	.globe-dot3 { animation-delay: 1.5s; }
	.globe-dot4 { animation-delay: 2.25s; }

	@keyframes dotPulse {
		0%, 100% { opacity: 0.3; transform: scale(1); }
		50% { opacity: 1; transform: scale(1.4); }
	}

	.url-alias {
		font-size: 1.2rem;
		font-weight: 700;
		color: oklch(0.55 0.14 var(--hue));
		word-break: break-all;
	}

	:global(.dark) .url-alias,
	.dark .url-alias {
		color: oklch(0.7 0.14 var(--hue));
	}

	.url-category-badge {
		font-size: 1rem;
		opacity: 0.7;
		flex-shrink: 0;
	}

	.url-meta {
		display: flex;
		gap: 0.75rem;
		font-size: 0.8rem;
		color: #64748b;
	}

	:global(.dark) .url-meta,
	.dark .url-meta {
		color: #94a3b8;
	}

	.copy-count {
		font-weight: 600;
	}

	.short-url-display {
		padding: 0.5rem 0.75rem;
		background: oklch(0.97 0.01 var(--hue));
		border-radius: 0.5rem;
		border: 1px solid oklch(0.92 0.02 var(--hue));
	}

	:global(.dark) .short-url-display,
	.dark .short-url-display {
		background: oklch(0.22 0.02 var(--hue));
		border-color: oklch(0.32 0.03 var(--hue));
	}

	.short-url-text {
		color: oklch(0.55 0.14 var(--hue));
		font-size: 0.95rem;
		font-weight: 600;
		word-break: break-all;
		line-height: 1.4;
	}

	:global(.dark) .short-url-text,
	.dark .short-url-text {
		color: oklch(0.75 0.14 var(--hue));
	}

	.original-url-ref {
		font-size: 0.8rem;
		color: #94a3b8;
	}

	:global(.dark) .original-url-ref,
	.dark .original-url-ref {
		color: #64748b;
	}

	.original-url-text {
		word-break: break-all;
		opacity: 0.7;
	}

	.url-card-actions {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.btn-card-action {
		padding: 0.45rem 0.85rem;
		background: white;
		color: #475569;
		border: 1px solid oklch(0.9 0.02 var(--hue));
		border-radius: 0.5rem;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease, transform 150ms ease;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	:global(.dark) .btn-card-action,
	.dark .btn-card-action {
		background: oklch(0.22 0.02 var(--hue));
		color: #cbd5e1;
		border-color: oklch(0.32 0.03 var(--hue));
	}

	.btn-card-action:hover {
		background: oklch(0.7 0.14 var(--hue));
		color: white;
		border-color: oklch(0.7 0.14 var(--hue));
		transform: translateY(-1px);
	}

	.btn-card-action:focus-visible {
		outline: 2px solid oklch(0.6 0.18 var(--hue));
		outline-offset: 2px;
	}

	.btn-card-action.copied {
		background: oklch(0.6 0.15 150);
		color: white;
		border-color: oklch(0.6 0.15 150);
	}

	.btn-card-action.btn-delete:hover {
		background: oklch(0.6 0.2 25);
		border-color: oklch(0.6 0.2 25);
	}

	.btn-copy-main {
		background: linear-gradient(135deg, oklch(0.7 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		color: white;
		border-color: transparent;
	}

	.btn-copy-main:hover:not(.copied) {
		background: linear-gradient(135deg, oklch(0.65 0.16 var(--hue)), oklch(0.6 0.18 calc(var(--hue) + 30)));
	}

	.btn-copy-main.copied {
		background: oklch(0.6 0.15 150);
	}

	/* Edit mode */
	.input-edit-alias {
		padding: 0.5rem 0.75rem;
		border: 2px solid oklch(0.7 0.14 var(--hue));
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 700;
		background: white;
		color: #0f172a;
		flex: 1;
		min-width: 100px;
	}

	:global(.dark) .input-edit-alias,
	.dark .input-edit-alias {
		background: oklch(0.22 0.02 var(--hue));
		color: #e2e8f0;
	}

	.input-edit-alias:focus {
		outline: none;
		box-shadow: 0 0 0 3px oklch(0.7 0.14 var(--hue) / 0.15);
	}

	.edit-actions {
		display: flex;
		gap: 0.4rem;
	}

	.btn-icon {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		cursor: pointer;
		transition: transform 150ms ease, opacity 150ms ease;
		font-weight: 700;
	}

	.btn-icon:hover {
		transform: scale(1.05);
	}

	.btn-icon:active {
		transform: scale(0.95);
	}

	.btn-icon:focus-visible {
		outline: 2px solid oklch(0.6 0.18 var(--hue));
		outline-offset: 2px;
	}

	.btn-save {
		background: oklch(0.6 0.15 150);
		color: white;
	}

	.btn-cancel {
		background: #cbd5e1;
		color: #0f172a;
	}

	:global(.dark) .btn-cancel,
	.dark .btn-cancel {
		background: #475569;
		color: #e2e8f0;
	}

	/* ============================================
      QR Modal
      ============================================ */
	.url-shortener-qr-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		animation: fadeIn 0.25s ease;
	}

	.url-shortener-qr-card {
		max-width: 400px;
		width: 100%;
		background: rgba(255, 255, 255, 0.98);
		border-radius: 1.25rem;
		padding: 1.75rem;
		box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.3);
		animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	:global(.dark) .url-shortener-qr-card,
	.dark .url-shortener-qr-card {
		background: rgba(15, 23, 42, 0.98);
		border-color: rgba(148, 163, 184, 0.2);
	}

	.url-shortener-qr-card h3 {
		font-size: 1.35rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0;
		word-break: break-all;
	}

	:global(.dark) .url-shortener-qr-card h3,
	.dark .url-shortener-qr-card h3 {
		color: #e2e8f0;
	}

	.qr-container {
		display: flex;
		justify-content: center;
		padding: 1rem;
		background: white;
		border-radius: 0.75rem;
	}

	.qr-container img {
		width: 200px;
		height: 200px;
		display: block;
	}

	.qr-url {
		color: #64748b;
		font-size: 0.82rem;
		word-break: break-all;
		margin: 0;
	}

	:global(.dark) .qr-url,
	.dark .qr-url {
		color: #94a3b8;
	}

	.qr-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn-close-qr {
		padding: 0.7rem 1.5rem;
		background: oklch(0.95 0.01 var(--hue));
		color: #475569;
		border: 1px solid oklch(0.85 0.05 var(--hue));
		border-radius: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 200ms ease, color 200ms ease, transform 150ms ease;
	}

	:global(.dark) .btn-close-qr,
	.dark .btn-close-qr {
		background: oklch(0.22 0.02 var(--hue));
		color: #cbd5e1;
		border-color: oklch(0.35 0.04 var(--hue));
	}

	.btn-close-qr:hover {
		background: oklch(0.9 0.03 var(--hue));
		transform: translateY(-1px);
	}

	.btn-close-qr:focus-visible {
		outline: 2px solid oklch(0.6 0.18 var(--hue));
		outline-offset: 2px;
	}

	.btn-download-qr {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.7rem 1.25rem;
		background: linear-gradient(135deg, oklch(0.7 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		color: white;
		border-radius: 0.75rem;
		font-weight: 600;
		text-decoration: none;
		transition: transform 150ms ease, box-shadow 200ms ease;
	}

	.btn-download-qr:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px oklch(0.7 0.14 var(--hue) / 0.35);
	}

	.btn-download-qr:focus-visible {
		outline: 2px solid white;
		outline-offset: 2px;
	}

	/* ============================================
      Onboarding
      ============================================ */
	.url-shortener-onboarding-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		animation: fadeIn 0.3s ease;
	}

	.url-shortener-onboarding-card {
		max-width: 560px;
		width: 100%;
		background: rgba(255, 255, 255, 0.98);
		border-radius: 1.5rem;
		padding: 2rem;
		box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.2);
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		animation: scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	:global(.dark) .url-shortener-onboarding-card,
	.dark .url-shortener-onboarding-card {
		background: rgba(15, 23, 42, 0.98);
		border-color: rgba(148, 163, 184, 0.2);
	}

	.onboarding-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.4rem;
		opacity: 0;
		animation: fadeInUp 0.5s ease forwards;
	}

	.onboarding-step:nth-child(1) { animation-delay: 0.1s; }
	.onboarding-step:nth-child(2) { animation-delay: 0.2s; }
	.onboarding-step:nth-child(3) { animation-delay: 0.3s; }

	.step-icon {
		font-size: 2.25rem;
		margin-bottom: 0.25rem;
	}

	.onboarding-step h3 {
		font-size: 1.15rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0;
	}

	:global(.dark) .onboarding-step h3,
	.dark .onboarding-step h3 {
		color: #e2e8f0;
	}

	.onboarding-step p {
		color: #475569;
		line-height: 1.5;
		font-size: 0.9rem;
		margin: 0;
	}

	:global(.dark) .onboarding-step p,
	.dark .onboarding-step p {
		color: #94a3b8;
	}

	.btn-onboarding {
		background: linear-gradient(135deg, oklch(0.7 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		color: white;
		border: none;
		border-radius: 0.75rem;
		padding: 0.85rem 1.75rem;
		font-weight: 700;
		font-size: 1rem;
		cursor: pointer;
		transition: transform 200ms ease, box-shadow 200ms ease;
		box-shadow: 0 8px 20px oklch(0.7 0.14 var(--hue) / 0.35);
		animation: fadeInUp 0.5s ease forwards 0.4s;
		opacity: 0;
		align-self: center;
	}

	.btn-onboarding:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 28px oklch(0.7 0.14 var(--hue) / 0.45);
	}

	.btn-onboarding:focus-visible {
		outline: 2px solid white;
		outline-offset: 2px;
	}

	/* ============================================
      Toast
      ============================================ */
	.toast-success {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		background: linear-gradient(135deg, oklch(0.7 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 999px;
		font-weight: 600;
		font-size: 0.9rem;
		box-shadow: 0 8px 24px oklch(0.7 0.14 var(--hue) / 0.35);
		z-index: 1000;
		pointer-events: none;
		animation: slideInUp 0.25s ease, fadeOut 0.3s ease calc(2.7s) forwards;
		max-width: 90vw;
		text-align: center;
	}

	@keyframes slideInUp {
		from {
			transform: translateX(-50%) translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateX(-50%) translateY(0);
			opacity: 1;
		}
	}

	@keyframes fadeOut {
		from { opacity: 1; }
		to { opacity: 0; }
	}

	/* ============================================
      Footer
      ============================================ */
	.url-shortener-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(0, 0, 0, 0.06);
		font-size: 0.8rem;
		color: #64748b;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	:global(.dark) .url-shortener-footer,
	.dark .url-shortener-footer {
		border-color: rgba(148, 163, 184, 0.12);
		color: #94a3b8;
	}

	.shortcuts-info {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		font-size: 0.78rem;
	}

	kbd {
		padding: 0.15rem 0.4rem;
		background: oklch(0.94 0.01 var(--hue));
		border: 1px solid oklch(0.85 0.02 var(--hue));
		border-radius: 0.25rem;
		font-family: ui-monospace, monospace;
		font-size: 0.75rem;
	}

	:global(.dark) kbd,
	.dark kbd {
		background: oklch(0.22 0.02 var(--hue));
		border-color: oklch(0.32 0.03 var(--hue));
	}

	.footer-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		text-align: right;
	}

	.ad-free-badge {
		font-size: 0.72rem;
		color: oklch(0.55 0.15 150);
		font-weight: 500;
	}

	:global(.dark) .ad-free-badge,
	.dark .ad-free-badge {
		color: oklch(0.7 0.15 150);
	}

	/* ============================================
      Info section
      ============================================ */
	.info-section {
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-radius: 1.25rem;
		padding: 1.5rem;
		border: 1px solid rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .info-section,
	.dark .info-section {
		background: rgba(30, 41, 59, 0.6);
		border-color: rgba(148, 163, 184, 0.15);
	}

	.info-section h3 {
		font-size: 1.2rem;
		font-weight: 700;
		margin: 0 0 1rem 0;
		color: oklch(0.55 0.14 var(--hue));
	}

	:global(.dark) .info-section h3,
	.dark .info-section h3 {
		color: oklch(0.75 0.14 var(--hue));
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	@media (max-width: 768px) {
		.info-grid {
			grid-template-columns: 1fr;
		}
	}

	.info-item {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.info-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.info-item strong {
		display: block;
		font-weight: 600;
		margin-bottom: 0.2rem;
		font-size: 0.9rem;
	}

	.info-item p {
		font-size: 0.82rem;
		color: #64748b;
		margin: 0;
		line-height: 1.4;
	}

	:global(.dark) .info-item p,
	.dark .info-item p {
		color: #94a3b8;
	}

	/* ============================================
      Animations globales
      ============================================ */
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes scaleIn {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ============================================
      Responsive
      ============================================ */
	@media (max-width: 640px) {
		.url-shortener-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.header-actions {
			width: 100%;
		}

		.header-actions .btn-action {
			flex: 1;
		}

		.category-filter {
			padding: 0.5rem;
		}

		.btn-category {
			padding: 0.45rem 0.75rem;
			font-size: 0.8rem;
		}

		.btn-sort {
			padding: 0.45rem 0.6rem;
			font-size: 0.8rem;
		}

		.filter-section {
			flex-direction: column;
			align-items: stretch;
		}

		.input-search {
			width: 100%;
		}

		.sort-buttons {
			width: 100%;
			justify-content: space-between;
		}

		.btn-sort {
			flex: 1;
		}

		.toast-success {
			bottom: 1rem;
			padding: 0.65rem 1.25rem;
			font-size: 0.85rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>
