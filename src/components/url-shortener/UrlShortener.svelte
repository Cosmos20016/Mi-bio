<script lang="ts">
import {
	applyStoredThemeToDocument,
	getStoredTheme,
	watchSystemThemeChanges,
} from "@utils/setting-utils.ts";
import { onDestroy, onMount } from "svelte";

const storageKey = "urlshortener:urls";

interface ShortenedUrl {
	id: string;
	originalUrl: string;
	shortUrl: string;
	alias: string;
	createdAt: string;
	copyCount: number;
	category: string;
	favicon: string;
}

// Core state
let urls: ShortenedUrl[] = [];
let inputUrl = "";
let inputAlias = "";
let inputCategory = "other";
let searchQuery = "";
let showQR = false;
let qrUrl = "";
let qrAlias = "";
let copiedId: string | null = null;
let copiedAliasId: string | null = null;
let showSuccess = false;
let successMessage = "";
let sortBy: "date" | "copies" | "name" = "date";
let isDark = false;
let isReady = false;
let showOnboarding = false;
let editingId: string | null = null;
let editingAlias = "";
let isShortening = false;
let filterCategory = "all";
let viewMode: "grid" | "list" = "list";

// Dark mode
let darkModeObserver: MutationObserver | null = null;
let stopThemeWatch: (() => void) | null = null;

// Max URLs to store
const MAX_URLS = 100;

// Categories
const categories = [
	{ id: "all", label: "📋 Todos", icon: "📋" },
	{ id: "social", label: "📱 Social", icon: "📱" },
	{ id: "work", label: "💼 Trabajo", icon: "💼" },
	{ id: "personal", label: "🏠 Personal", icon: "🏠" },
	{ id: "dev", label: "💻 Dev", icon: "💻" },
	{ id: "other", label: "🔗 Otros", icon: "🔗" },
];

// Fallback SVG icon for failed favicon loads
const fallbackIconSvg = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
</svg>
`)}`;

// Track which favicons failed to load
let failedFavicons = new Set<string>();

// Palabras para generar alias legibles
const adjectives = [
	"fast",
	"cool",
	"smart",
	"bold",
	"zen",
	"nova",
	"pro",
	"top",
	"max",
	"ace",
	"epic",
	"mega",
	"ultra",
	"hyper",
	"super",
	"prime",
	"elite",
	"alpha",
	"beta",
	"neon",
];
const nouns = [
	"link",
	"go",
	"hub",
	"bit",
	"web",
	"net",
	"dot",
	"io",
	"app",
	"dev",
	"code",
	"data",
	"page",
	"site",
	"path",
	"way",
	"fox",
	"owl",
	"bee",
	"cat",
];

// Constants
const MAX_DOMAIN_ALIAS_LENGTH = 8;

// Category map for O(1) lookups
const categoryMap = categories.reduce(
	(acc, cat) => {
		acc[cat.id] = cat;
		return acc;
	},
	{} as Record<string, (typeof categories)[0]>,
);

// Helper to get category label without icon
const getCategoryLabel = (categoryId: string): string => {
	const cat = categoryMap[categoryId];
	return cat ? cat.label.replace(cat.icon + " ", "") : "Otros";
};

// Load URLs from localStorage
const loadUrls = () => {
	try {
		const stored = localStorage.getItem(storageKey);
		if (stored) {
			const parsed = JSON.parse(stored);
			// Add backward compatibility for URLs without new fields
			urls = parsed.map((url: ShortenedUrl) => ({
				...url,
				shortUrl: url.shortUrl || url.originalUrl,
				category: url.category || "other",
				favicon: url.favicon || "",
			}));
		}
	} catch (e) {
		console.error("Failed to load URLs:", e);
	}
};

// Save URLs to localStorage
const saveUrls = () => {
	try {
		localStorage.setItem(storageKey, JSON.stringify(urls));
	} catch (e) {
		console.error("Failed to save URLs:", e);
	}
};

// Generate a simple hash for alias
const generateAlias = (url: string): string => {
	// Try to extract something from the domain first
	try {
		const parsed = new URL(url);
		const domain = parsed.hostname.replace("www.", "").split(".")[0];
		if (
			domain.length <= MAX_DOMAIN_ALIAS_LENGTH &&
			/^[a-zA-Z0-9]+$/.test(domain)
		) {
			const suffix = Math.random().toString(36).substring(2, 5);
			return `${domain}-${suffix}`;
		}
	} catch {}

	// Fallback: generate memorable alias
	const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
	const noun = nouns[Math.floor(Math.random() * nouns.length)];
	const num = Math.floor(Math.random() * 99);
	return `${adj}-${noun}${num}`;
};

// Auto-detect category from URL
const detectCategory = (url: string): string => {
	try {
		const domain = new URL(url).hostname.toLowerCase();
		if (
			/youtube|tiktok|instagram|facebook|twitter|x\.com|linkedin|threads/.test(
				domain,
			)
		)
			return "social";
		if (/github|gitlab|stackoverflow|npmjs|vercel|netlify/.test(domain))
			return "dev";
		if (/docs\.google|notion|slack|trello|asana|jira|figma/.test(domain))
			return "work";
		return "other";
	} catch {
		return "other";
	}
};

// Get favicon from URL with fallback chain
const getFavicon = (url: string): string => {
	try {
		const domain = new URL(url).hostname;
		// Use Google S2 favicons API as primary (more reliable)
		return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
	} catch {
		return fallbackIconSvg;
	}
};

// Handle favicon load errors
const handleFaviconError = (event: Event, urlId: string) => {
	const img = event.currentTarget as HTMLImageElement;
	const originalUrl = img.dataset.url;

	// First failure: try DuckDuckGo fallback
	if (!failedFavicons.has(urlId)) {
		failedFavicons.add(urlId);
		// Try DuckDuckGo as second fallback
		if (originalUrl) {
			try {
				const domain = new URL(originalUrl).hostname;
				img.src = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
				return;
			} catch {
				// Invalid URL, fall through to SVG fallback
			}
		}
	}
	// Second failure or no original URL: use inline SVG fallback
	img.src = fallbackIconSvg;
};

// Validate URL
const isValidUrl = (url: string): boolean => {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
};

// Normalize URL (add https:// if missing)
const normalizeUrl = (url: string): string => {
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		return `https://${url}`;
	}
	return url;
};

// Validate alias
const isValidAlias = (alias: string): boolean => {
	return /^[a-zA-Z0-9-]{1,30}$/.test(alias);
};

// API 1: CleanURI (gratis, sin auth, CORS habilitado, confiable en móvil)
const shortenWithCleanUri = async (longUrl: string): Promise<string> => {
	const response = await fetch("https://cleanuri.com/api/v1/shorten", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: `url=${encodeURIComponent(longUrl)}`,
	});
	if (!response.ok) throw new Error(`CleanURI HTTP ${response.status}`);
	const data = await response.json();
	if (data.error) throw new Error(data.error);
	return data.result_url;
};

// API 2: spoo.me (gratis, sin ads, CORS habilitado)
const shortenWithSpooMe = async (longUrl: string): Promise<string> => {
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
	if (!data.short_url) throw new Error("No short URL returned");
	return data.short_url;
};

// API 3: shrtco.de (gratis, sin ads, CORS habilitado)
const shortenWithShrtcode = async (longUrl: string): Promise<string> => {
	const endpoint = `https://api.shrtco.de/v2/shorten?url=${encodeURIComponent(longUrl)}`;
	const response = await fetch(endpoint);
	if (!response.ok) throw new Error(`shrtco.de HTTP ${response.status}`);
	const data = await response.json();
	if (!data.ok || !data.result)
		throw new Error(data.error || "Shortening failed");
	return data.result.full_short_link;
};

// API 4: ulvis.net (gratis, sin ads)
const shortenWithUlvis = async (longUrl: string): Promise<string> => {
	const endpoint = `https://ulvis.net/API/write/get?url=${encodeURIComponent(longUrl)}&type=json`;
	const response = await fetch(endpoint);
	if (!response.ok) throw new Error(`ulvis.net HTTP ${response.status}`);
	const data = await response.json();
	if (!data.data || !data.data.url) throw new Error("No short URL returned");
	return data.data.url;
};

// Controlador principal: prueba APIs sin publicidad en cascada hasta que una funcione
const shortenUrl = async (longUrl: string): Promise<string> => {
	const apis = [
		{ name: "CleanURI", fn: shortenWithCleanUri },
		{ name: "spoo.me", fn: shortenWithSpooMe },
		{ name: "shrtco.de", fn: shortenWithShrtcode },
		{ name: "ulvis.net", fn: shortenWithUlvis },
	];

	for (const api of apis) {
		try {
			const result = await api.fn(longUrl);
			if (result && result !== longUrl && result.startsWith("http")) {
				console.log(`✓ URL acortada con ${api.name}`);
				return result;
			}
		} catch (err) {
			console.warn(`✗ ${api.name} falló:`, err);
		}
	}

	throw new Error("Todos los servicios de acortamiento no disponibles");
};

// Show success toast
const showSuccessToast = (message: string) => {
	successMessage = message;
	showSuccess = true;
	setTimeout(() => {
		showSuccess = false;
		successMessage = "";
	}, 3000);
};

// Add URL
const addUrl = async () => {
	if (!inputUrl.trim()) return;

	const normalized = normalizeUrl(inputUrl.trim());
	if (!isValidUrl(normalized)) {
		alert("Por favor ingresa un URL válido");
		return;
	}

	let alias = inputAlias.trim();
	if (!alias) {
		alias = generateAlias(normalized);
	} else if (!isValidAlias(alias)) {
		alert("Alias inválido. Solo letras, números y guiones (1-30 caracteres)");
		return;
	}

	// Check for duplicate alias
	if (urls.some((u) => u.alias === alias)) {
		alert("Ya existe un URL con ese alias");
		return;
	}

	// Check for duplicate URL
	const existingUrl = urls.find((u) => u.originalUrl === normalized);
	if (existingUrl) {
		// Instead of blocking, ask if they want to copy the existing one
		if (
			confirm(
				`Este URL ya existe con alias #${existingUrl.alias}. ¿Copiar al portapapeles?`,
			)
		) {
			copyUrl(existingUrl);
		}
		return;
	}

	// Check max URLs
	if (urls.length >= MAX_URLS) {
		alert(`Máximo ${MAX_URLS} URLs permitidos`);
		return;
	}

	isShortening = true;
	try {
		const shortUrl = await shortenUrl(normalized);
		const newUrl: ShortenedUrl = {
			id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
			originalUrl: normalized,
			shortUrl,
			alias,
			createdAt: new Date().toISOString(),
			copyCount: 0,
			category: inputCategory,
			favicon: getFavicon(normalized),
		};
		urls = [newUrl, ...urls];
		saveUrls();
		inputUrl = "";
		inputAlias = "";
		inputCategory = "other";
		showSuccessToast("✓ URL acortada · Sin publicidad");
	} catch (err) {
		console.error("URL shortening failed:", err);
		const saveAnyway = confirm(
			"No se pudo acortar la URL (los servicios no están disponibles). ¿Guardarla de todos modos sin acortar?",
		);
		if (saveAnyway) {
			const newUrl: ShortenedUrl = {
				id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
				originalUrl: normalized,
				shortUrl: normalized,
				alias,
				createdAt: new Date().toISOString(),
				copyCount: 0,
				category: inputCategory,
				favicon: getFavicon(normalized),
			};
			urls = [newUrl, ...urls];
			saveUrls();
			inputUrl = "";
			inputAlias = "";
			inputCategory = "other";
			showSuccessToast("⚠️ Guardado sin acortar");
		}
	} finally {
		isShortening = false;
	}
};

// Copy URL to clipboard
const copyUrl = (urlEntry: ShortenedUrl) => {
	// Copy the SHORT url
	navigator.clipboard
		.writeText(urlEntry.shortUrl)
		.then(() => {
			// Increment copy count
			urls = urls.map((u) =>
				u.id === urlEntry.id ? { ...u, copyCount: u.copyCount + 1 } : u,
			);
			saveUrls();

			// Show feedback
			copiedId = urlEntry.id;
			setTimeout(() => {
				copiedId = null;
			}, 2000);
		})
		.catch(() => {
			alert(
				"Error al copiar al portapapeles. Verifica los permisos del navegador.",
			);
		});
};

// Copy alias to clipboard
const copyAlias = (urlEntry: ShortenedUrl) => {
	navigator.clipboard
		.writeText(`#${urlEntry.alias}`)
		.then(() => {
			copiedAliasId = urlEntry.id;
			setTimeout(() => {
				copiedAliasId = null;
			}, 2000);
		})
		.catch(() => {
			alert(
				"Error al copiar al portapapeles. Verifica los permisos del navegador.",
			);
		});
};

// Delete URL
const deleteUrl = (id: string) => {
	if (confirm("¿Eliminar este URL?")) {
		urls = urls.filter((u) => u.id !== id);
		// Clean up failed favicon tracking for deleted URL
		failedFavicons.delete(id);
		saveUrls();
	}
};

// Show QR code
const showQRCode = (url: ShortenedUrl) => {
	qrUrl = url.originalUrl;
	qrAlias = url.alias;
	showQR = true;
};

// Close QR modal
const closeQR = () => {
	showQR = false;
	qrUrl = "";
	qrAlias = "";
};

// Start editing alias
const startEditAlias = (url: ShortenedUrl) => {
	editingId = url.id;
	editingAlias = url.alias;
};

// Save edited alias
const saveEditAlias = () => {
	if (!editingId) return;

	const newAlias = editingAlias.trim();
	if (!newAlias || !isValidAlias(newAlias)) {
		alert("Alias inválido. Solo letras, números y guiones (1-30 caracteres)");
		return;
	}

	// Check for duplicate alias
	if (urls.some((u) => u.alias === newAlias && u.id !== editingId)) {
		alert("Ya existe un URL con ese alias");
		return;
	}

	urls = urls.map((u) => (u.id === editingId ? { ...u, alias: newAlias } : u));
	saveUrls();

	editingId = null;
	editingAlias = "";
};

// Cancel editing
const cancelEditAlias = () => {
	editingId = null;
	editingAlias = "";
};

// Export URLs
const exportUrls = () => {
	const dataStr = JSON.stringify(urls, null, 2);
	const dataBlob = new Blob([dataStr], { type: "application/json" });
	const url = URL.createObjectURL(dataBlob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `urls-${new Date().toISOString().split("T")[0]}.json`;
	link.click();
	URL.revokeObjectURL(url);
};

// Import URLs
const importUrls = () => {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = "application/json";
	input.onchange = (e) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const imported = JSON.parse(e.target?.result as string);
				if (Array.isArray(imported)) {
					urls = imported;
					saveUrls();
					alert(`${imported.length} URLs importados`);
				}
			} catch (err) {
				alert("Error al importar archivo");
			}
		};
		reader.readAsText(file);
	};
	input.click();
};

// Filter and sort URLs
$: filteredUrls = urls
	.filter((u) => {
		const matchesSearch =
			!searchQuery ||
			u.originalUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
			u.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
			u.category.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesCategory =
			filterCategory === "all" || u.category === filterCategory;
		return matchesSearch && matchesCategory;
	})
	.sort((a, b) => {
		if (sortBy === "date")
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		if (sortBy === "copies") return b.copyCount - a.copyCount;
		return a.alias.localeCompare(b.alias);
	});

// Statistics
$: totalUrls = urls.length;
$: totalCopies = urls.reduce((sum, u) => sum + u.copyCount, 0);
$: mostCopiedUrl = urls.reduce(
	(max, u) => (u.copyCount > max.copyCount ? u : max),
	{ alias: "N/A", copyCount: 0 } as ShortenedUrl,
);
$: mostUsedCategory = (() => {
	const categoryCounts = urls.reduce(
		(acc, u) => {
			acc[u.category] = (acc[u.category] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);
	const maxCategory = Object.entries(categoryCounts).reduce(
		(max, [cat, count]) => (count > max.count ? { cat, count } : max),
		{ cat: "other", count: 0 },
	);
	const category = categoryMap[maxCategory.cat];
	return category ? category.label : "🔗 Otros";
})();

// Auto-detect category when URL changes
$: if (inputUrl) {
	const normalized = normalizeUrl(inputUrl.trim());
	if (isValidUrl(normalized)) {
		inputCategory = detectCategory(normalized);
	}
}

// Format date
const formatDate = (isoDate: string): string => {
	const date = new Date(isoDate);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return "Ahora";
	if (diffMins < 60) return `Hace ${diffMins} min`;
	if (diffHours < 24) return `Hace ${diffHours} h`;
	if (diffDays === 1) return "Ayer";
	if (diffDays < 7) return `Hace ${diffDays} días`;
	return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
};

// Keyboard shortcuts
const onKey = (event: KeyboardEvent) => {
	if (event.target && (event.target as HTMLElement).tagName === "INPUT") return;

	if (event.key === "Escape" && showQR) {
		closeQR();
		return;
	}

	if ((event.ctrlKey || event.metaKey) && event.key === "e") {
		event.preventDefault();
		exportUrls();
	}
};

// Initialize
onMount(() => {
	loadUrls();

	// Dark mode detection
	const htmlElement = document.documentElement;
	isDark = htmlElement.classList.contains("dark");

	darkModeObserver = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (
				mutation.type === "attributes" &&
				mutation.attributeName === "class"
			) {
				isDark = htmlElement.classList.contains("dark");
			}
		}
	});

	darkModeObserver.observe(htmlElement, {
		attributes: true,
		attributeFilter: ["class"],
	});

	// Theme watcher
	applyStoredThemeToDocument();
	const theme = getStoredTheme();
	stopThemeWatch = watchSystemThemeChanges(theme);

	// Keyboard shortcuts
	document.addEventListener("keydown", onKey);

	// Check if first time
	const hasSeenOnboarding = localStorage.getItem("urlshortener:onboarding");
	if (!hasSeenOnboarding && urls.length === 0) {
		showOnboarding = true;
	}

	isReady = true;
});

onDestroy(() => {
	if (darkModeObserver) {
		darkModeObserver.disconnect();
	}
	if (stopThemeWatch) {
		stopThemeWatch();
	}
	document.removeEventListener("keydown", onKey);
});

const closeOnboarding = () => {
	showOnboarding = false;
	localStorage.setItem("urlshortener:onboarding", "true");
};
</script>

{#if isReady}
	<div class="url-shortener-wrapper" class:dark={isDark}>
		<!-- Onboarding -->
		{#if showOnboarding}
			<div class="url-shortener-onboarding-overlay">
				<div class="url-shortener-onboarding-card">
					<div class="onboarding-step">
						<div class="step-icon">🔗</div>
						<h3>Acorta tus URLs</h3>
						<p>
							Pega cualquier URL largo y crea un alias personalizado para
							acceder fácilmente
						</p>
					</div>

					<div class="onboarding-step">
						<div class="step-icon">📊</div>
						<h3>Organiza y rastrea</h3>
						<p>
							Historial completo con estadísticas de uso, búsqueda y
							ordenamiento
						</p>
					</div>

					<div class="onboarding-step">
						<div class="step-icon">📱</div>
						<h3>Genera QR Codes</h3>
						<p>
							Crea códigos QR al instante para compartir tus enlaces en físico
						</p>
					</div>

					<button class="btn-onboarding" on:click={closeOnboarding}>
						¡Comenzar!
					</button>
				</div>
			</div>
		{/if}

		<!-- QR Modal -->
		{#if showQR}
			<div class="url-shortener-qr-overlay" on:click={closeQR}>
				<div class="url-shortener-qr-card" on:click={(e) => e.stopPropagation()}>
					<h3>QR Code: {qrAlias}</h3>
					<div class="qr-container">
						<img
							src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
							alt="QR Code"
						/>
					</div>
					<p class="qr-url">{qrUrl}</p>
					<div class="qr-actions">
						<button class="btn-close-qr" on:click={closeQR}>Cerrar</button>
						<a
							class="btn-download-qr"
							href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${e
