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
	domainHue?: number;
}

// Core state
let urls: ShortenedUrl[] = [];
let inputUrl = "";
let inputAlias = "";
let inputCategory = "other";
let searchQuery = "";
let filterCategory = "all";
let sortBy: "date" | "copies" | "name" = "date";
let viewMode: "grid" | "list" = "list";

// UI state
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

// Dark mode observers
let darkModeObserver: MutationObserver | null = null;
let stopThemeWatch: (() => void) | null = null;

// Constants
const MAX_URLS = 100;
const MAX_DOMAIN_ALIAS_LENGTH = 8;

// Categories
const categories = [
	{ id: "all", label: "📋 Todos", icon: "📋" },
	{ id: "social", label: "📱 Social", icon: "📱" },
	{ id: "work", label: "💼 Trabajo", icon: "💼" },
	{ id: "personal", label: "🏠 Personal", icon: "🏠" },
	{ id: "dev", label: "💻 Dev", icon: "💻" },
	{ id: "other", label: "🔗 Otros", icon: "🔗" },
];

const categoryRules = {
	social: ['youtube', 'tiktok', 'instagram', 'facebook', 'twitter', 'x.com', 'linkedin', 'threads', 'pinterest', 'reddit', 'twitch', 'discord', 'snapchat'],
	dev: ['github', 'gitlab', 'stackoverflow', 'npmjs', 'vercel', 'netlify', 'codepen', 'codesandbox', 'replit'],
	work: ['docs.google', 'notion', 'slack', 'trello', 'asana', 'jira', 'figma', 'zoom', 'teams.microsoft', 'meet.google'],
	personal: ['blogspot', 'wordpress.com', 'medium', 'tumblr', 'wix', 'squarespace', 'spotify', 'soundcloud']
};

const adjectives = ["fast", "cool", "smart", "bold", "zen", "nova", "pro", "top", "max", "ace"];
const nouns = ["link", "go", "hub", "bit", "web", "net", "dot", "io", "app", "dev"];

// Función para generar color único basado en el dominio
const getDomainColor = (url: string): number => {
	try {
		const hostname = new URL(url).hostname.replace('www.', '');
		let hash = 0;
		for (let i = 0; i < hostname.length; i++) {
			hash = hostname.charCodeAt(i) + ((hash << 5) - hash);
		}
		return Math.abs(hash % 360);
	} catch {
		return 200;
	}
};

// Utility functions
const categoryMap = categories.reduce((acc, cat) => { acc[cat.id] = cat; return acc; }, {} as Record<string, (typeof categories)[0]>);

const getCategoryLabel = (categoryId: string): string => {
	const cat = categoryMap[categoryId];
	return cat ? cat.label.replace(cat.icon + " ", "") : "Otros";
};

const detectCategory = (url: string): string => {
	try {
		const hostname = new URL(url).hostname.toLowerCase();
		for (const [category, domains] of Object.entries(categoryRules)) {
			if (domains.some(domain => hostname.includes(domain))) return category;
		}
	} catch {}
	return 'other';
};

const isValidUrl = (url: string): boolean => {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
};

const normalizeUrl = (url: string): string => {
	if (!url.startsWith("http://") && !url.startsWith("https://")) return `https://${url}`;
	return url;
};

const isValidAlias = (alias: string): boolean => /^[a-zA-Z0-9-]{1,30}$/.test(alias);

const generateAlias = (url: string): string => {
	try {
		const parsed = new URL(url);
		const domain = parsed.hostname.replace("www.", "").split(".")[0];
		if (domain.length <= MAX_DOMAIN_ALIAS_LENGTH && /^[a-zA-Z0-9]+$/.test(domain)) {
			return `${domain}-${Math.random().toString(36).substring(2, 5)}`;
		}
	} catch {}
	const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
	const noun = nouns[Math.floor(Math.random() * nouns.length)];
	return `${adj}-${noun}${Math.floor(Math.random() * 99)}`;
};

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

// Storage
const loadUrls = () => {
	try {
		const stored = localStorage.getItem(storageKey);
		if (stored) {
			urls = JSON.parse(stored).map((url: ShortenedUrl) => ({
				...url,
				shortUrl: url.shortUrl || url.originalUrl,
				category: url.category || "other",
				domainHue: getDomainColor(url.originalUrl),
			}));
		}
	} catch (e) {
		console.error("Failed to load URLs:", e);
	}
};

const saveUrls = () => {
	try {
		localStorage.setItem(storageKey, JSON.stringify(urls));
	} catch (e) {
		console.error("Failed to save URLs:", e);
	}
};

// URL Shortening APIs
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

const shortenWithSpooMe = async (longUrl: string): Promise<string> => {
	const response = await fetch("https://spoo.me/", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
		body: `url=${encodeURIComponent(longUrl)}`,
	});
	if (!response.ok) throw new Error(`spoo.me HTTP ${response.status}`);
	const data = await response.json();
	if (!data.short_url) throw new Error("No short URL returned");
	return data.short_url;
};

const shortenWithShrtcode = async (longUrl: string): Promise<string> => {
	const response = await fetch(`https://api.shrtco.de/v2/shorten?url=${encodeURIComponent(longUrl)}`);
	if (!response.ok) throw new Error(`shrtco.de HTTP ${response.status}`);
	const data = await response.json();
	if (!data.ok || !data.result) throw new Error(data.error || "Shortening failed");
	return data.result.full_short_link;
};

const shortenUrl = async (longUrl: string): Promise<string> => {
	const apis = [
		{ name: "CleanURI", fn: shortenWithCleanUri },
		{ name: "spoo.me", fn: shortenWithSpooMe },
		{ name: "shrtco.de", fn: shortenWithShrtcode },
	];

	for (const api of apis) {
		try {
			const result = await api.fn(longUrl);
			if (result && result !== longUrl && result.startsWith("http")) {
				return result;
			}
		} catch (err) {
			console.warn(`${api.name} falló:`, err);
		}
	}
	throw new Error("Todos los servicios de acortamiento no disponibles");
};

// UI Actions
const showSuccessToast = (message: string) => {
	successMessage = message;
	showSuccess = true;
	setTimeout(() => {
		showSuccess = false;
		successMessage = "";
	}, 3000);
};

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

	if (urls.some((u) => u.alias === alias)) {
		alert("Ya existe un URL con ese alias");
		return;
	}

	const existingUrl = urls.find((u) => u.originalUrl === normalized);
	if (existingUrl) {
		if (confirm(`Este URL ya existe con alias #${existingUrl.alias}. ¿Copiar al portapapeles?`)) {
			copyUrl(existingUrl);
		}
		return;
	}

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
			domainHue: getDomainColor(normalized),
		};
		urls = [newUrl, ...urls];
		saveUrls();
		inputUrl = "";
		inputAlias = "";
		inputCategory = "other";
		showSuccessToast("✓ URL acortada");
	} catch (err) {
		if (confirm("El acortamiento está temporalmente inactivo. ¿Guardar enlace original?")) {
			const newUrl: ShortenedUrl = {
				id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
				originalUrl: normalized,
				shortUrl: normalized,
				alias,
				createdAt: new Date().toISOString(),
				copyCount: 0,
				category: inputCategory,
				domainHue: getDomainColor(normalized),
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

const copyUrl = (urlEntry: ShortenedUrl) => {
	navigator.clipboard.writeText(urlEntry.shortUrl).then(() => {
		urls = urls.map((u) => u.id === urlEntry.id ? { ...u, copyCount: u.copyCount + 1 } : u);
		saveUrls();
		copiedId = urlEntry.id;
		setTimeout(() => { copiedId = null; }, 2000);
	}).catch(() => alert("Error al copiar al portapapeles"));
};

const copyAlias = (urlEntry: ShortenedUrl) => {
	navigator.clipboard.writeText(`#${urlEntry.alias}`).then(() => {
		copiedAliasId = urlEntry.id;
		setTimeout(() => { copiedAliasId = null; }, 2000);
	}).catch(() => alert("Error al copiar al portapapeles"));
};

const deleteUrl = (id: string) => {
	if (confirm("¿Eliminar este URL?")) {
		urls = urls.filter((u) => u.id !== id);
		saveUrls();
	}
};

const showQRCode = (url: ShortenedUrl) => {
	qrUrl = url.originalUrl;
	qrAlias = url.alias;
	showQR = true;
};

const closeQR = () => {
	showQR = false;
	qrUrl = "";
	qrAlias = "";
};

const startEditAlias = (url: ShortenedUrl) => {
	editingId = url.id;
	editingAlias = url.alias;
};

const saveEditAlias = () => {
	if (!editingId) return;
	const newAlias = editingAlias.trim();
	if (!newAlias || !isValidAlias(newAlias)) {
		alert("Alias inválido");
		return;
	}
	if (urls.some((u) => u.alias === newAlias && u.id !== editingId)) {
		alert("Ya existe un URL con ese alias");
		return;
	}
	urls = urls.map((u) => (u.id === editingId ? { ...u, alias: newAlias } : u));
	saveUrls();
	editingId = null;
	editingAlias = "";
};

const cancelEditAlias = () => {
	editingId = null;
	editingAlias = "";
};

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
			} catch {
				alert("Error al importar archivo");
			}
		};
		reader.readAsText(file);
	};
	input.click();
};

const closeOnboarding = () => {
	showOnboarding = false;
	localStorage.setItem("urlshortener:onboarding", "true");
};

// Reactive statements
$: filteredUrls = urls.filter((u) => {
	const matchesSearch = !searchQuery || u.originalUrl.toLowerCase().includes(searchQuery.toLowerCase()) || u.alias.toLowerCase().includes(searchQuery.toLowerCase());
	const matchesCategory = filterCategory === "all" || u.category === filterCategory;
	return matchesSearch && matchesCategory;
}).sort((a, b) => {
	if (sortBy === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	if (sortBy === "copies") return b.copyCount - a.copyCount;
	return a.alias.localeCompare(b.alias);
});

$: totalUrls = urls.length;
$: totalCopies = urls.reduce((sum, u) => sum + u.copyCount, 0);
$: mostUsedCategory = (() => {
	const categoryCounts = urls.reduce((acc, u) => { acc[u.category] = (acc[u.category] || 0) + 1; return acc; }, {} as Record<string, number>);
	const maxCategory = Object.entries(categoryCounts).reduce((max, [cat, count]) => (count > max.count ? { cat, count } : max), { cat: "other", count: 0 });
	const category = categoryMap[maxCategory.cat];
	return category ? category.label : "🔗 Otros";
})();

$: if (inputUrl) {
	const normalized = normalizeUrl(inputUrl.trim());
	if (isValidUrl(normalized)) inputCategory = detectCategory(normalized);
}

// Lifecycle
const onKey = (event: KeyboardEvent) => {
	if (event.target && (event.target as HTMLElement).tagName === "INPUT") return;
	if (event.key === "Escape" && showQR) closeQR();
	if ((event.ctrlKey || event.metaKey) && event.key === "e") {
		event.preventDefault();
		exportUrls();
	}
};

onMount(() => {
	loadUrls();
	const htmlElement = document.documentElement;
	isDark = htmlElement.classList.contains("dark");
	darkModeObserver = new MutationObserver(() => {
		isDark = htmlElement.classList.contains("dark");
	});
	darkModeObserver.observe(htmlElement, { attributes: true, attributeFilter: ["class"] });
	applyStoredThemeToDocument();
	const theme = getStoredTheme();
	stopThemeWatch = watchSystemThemeChanges(theme);
	document.addEventListener("keydown", onKey);
	const hasSeenOnboarding = localStorage.getItem("urlshortener:onboarding");
	if (!hasSeenOnboarding && urls.length === 0) showOnboarding = true;
	isReady = true;
});

onDestroy(() => {
	if (darkModeObserver) darkModeObserver.disconnect();
	if (stopThemeWatch) stopThemeWatch();
	document.removeEventListener("keydown", onKey);
});
</script>

{#if isReady}
	<div class="url-shortener-wrapper" class:dark={isDark}>
		{#if showOnboarding}
			<div class="url-shortener-onboarding-overlay">
				<div class="url-shortener-onboarding-card">
					<div class="onboarding-step">
						<div class="step-icon">🔗</div>
						<h3>Acorta tus URLs</h3>
						<p>Pega cualquier URL largo y crea un alias personalizado</p>
					</div>
					<div class="onboarding-step">
						<div class="step-icon">📊</div>
						<h3>Organiza y rastrea</h3>
						<p>Historial completo con estadísticas de uso</p>
					</div>
					<div class="onboarding-step">
						<div class="step-icon">📱</div>
						<h3>Genera QR Codes</h3>
						<p>Crea códigos QR al instante</p>
					</div>
					<button class="btn-onboarding" on:click={closeOnboarding}>¡Comenzar!</button>
				</div>
			</div>
		{/if}

		{#if showQR}
			<div class="url-shortener-qr-overlay" on:click={closeQR}>
				<div class="url-shortener-qr-card" on:click={(e) => e.stopPropagation()}>
					<h3>QR Code: {qrAlias}</h3>
					<div class="qr-container">
						<img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="QR Code" />
					</div>
					<p class="qr-url">{qrUrl}</p>
					<div class="qr-actions">
						<button class="btn-close-qr" on:click={closeQR}>Cerrar</button>
						<a class="btn-download-qr" href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}`} download={`qr-${qrAlias}.png`} target="_blank">💾 Descargar QR</a>
					</div>
				</div>
			</div>
		{/if}

		{#if showSuccess}
			<div class="toast-success">
				<span>{successMessage}</span>
			</div>
		{/if}

		<div class="url-shortener-header">
			<div>
				<h2 class="url-shortener-title">Acortador de URLs</h2>
				<p class="url-shortener-subtitle">Organiza, acorta y gestiona tus enlaces favoritos</p>
				<div class="stats-row">
					<span class="stat-item">📊 {totalUrls} URLs</span>
					<span class="stat-item">📋 {totalCopies} copias</span>
					{#if urls.length > 0}
						<span class="stat-item">⭐ {mostUsedCategory}</span>
					{/if}
				</div>
			</div>
			<div class="header-actions">
				<button class="btn-action" on:click={exportUrls}>📤 Exportar</button>
				<button class="btn-action" on:click={importUrls}>📥 Importar</button>
			</div>
		</div>

		<div class="input-section">
			<div class="input-row">
				<input type="text" bind:value={inputUrl} placeholder="Pega tu URL largo aquí..." class="input-url" on:keydown={(e) => e.key === "Enter" && addUrl()} />
				<input type="text" bind:value={inputAlias} placeholder="Alias (opcional)" class="input-alias" on:keydown={(e) => e.key === "Enter" && addUrl()} />
				<select bind:value={inputCategory} class="select-category">
					{#each categories.filter(c => c.id !== 'all') as cat}
						<option value={cat.id}>{cat.icon} {getCategoryLabel(cat.id)}</option>
					{/each}
				</select>
				<button class="btn-add" on:click={addUrl} disabled={isShortening}>
					{isShortening ? "⏳ Acortando..." : "🔗 Acortar"}
				</button>
			</div>
			<p class="input-hint">Sin alias, se genera uno automático. Categoría detectada automáticamente.</p>
		</div>

		{#if urls.length > 0}
			<div class="category-filter">
				{#each categories as cat}
					<button class="btn-category" class:active={filterCategory === cat.id} on:click={() => (filterCategory = cat.id)}>
						{cat.icon} {getCategoryLabel(cat.id)}
					</button>
				{/each}
			</div>
		{/if}

		<div class="filter-section">
			<input type="text" bind:value={searchQuery} placeholder="🔍 Buscar por alias o URL..." class="input-search" />
			<div class="sort-buttons">
				<button class="btn-sort" class:active={sortBy === "date"} on:click={() => (sortBy = "date")}>📅 Fecha</button>
				<button class="btn-sort" class:active={sortBy === "copies"} on:click={() => (sortBy = "copies")}>📊 Copias</button>
				<button class="btn-sort" class:active={sortBy === "name"} on:click={() => (sortBy = "name")}>🔤 Nombre</button>
				<button class="btn-sort" on:click={() => (viewMode = viewMode === 'list' ? 'grid' : 'list')}>
					{viewMode === 'list' ? '🔲 Grid' : '📋 Lista'}
				</button>
			</div>
		</div>

		{#if urls.length === 0 && !searchQuery}
			<div class="info-section">
				<h3>¿Cómo funciona?</h3>
				<div class="info-grid">
					<div class="info-item">
						<span class="info-icon">📋</span>
						<div>
							<strong>Guarda y organiza</strong>
							<p>Almacena tus enlaces favoritos con alias fáciles de recordar</p>
						</div>
					</div>
					<div class="info-item">
						<span class="info-icon">📱</span>
						<div>
							<strong>Genera QR Codes</strong>
							<p>Crea códigos QR al instante para compartir</p>
						</div>
					</div>
					<div class="info-item">
						<span class="info-icon">📊</span>
						<div>
							<strong>Rastrea tu uso</strong>
							<p>Mira cuántas veces has copiado cada enlace</p>
						</div>
					</div>
					<div class="info-item">
						<span class="info-icon">💾</span>
						<div>
							<strong>Exporta todo</strong>
							<p>Descarga o importa tu biblioteca completa</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<div class="urls-list" class:view-grid={viewMode === 'grid'}>
			{#if filteredUrls.length === 0}
				<div class="empty-state">
					{#if searchQuery}
						<p>No se encontraron URLs con "{searchQuery}"</p>
					{:else}
						<p>🔗 No tienes URLs guardados aún</p>
						<p class="empty-hint">Pega un URL arriba para comenzar</p>
					{/if}
				</div>
			{:else}
				{#each filteredUrls as url (url.id)}
					<div class="url-card">
						<div class="url-card-header">
							{#if editingId === url.id}
								<input type="text" bind:value={editingAlias} class="input-edit-alias" on:keydown={(e) => { if (e.key === "Enter") saveEditAlias(); if (e.key === "Escape") cancelEditAlias(); }} autofocus />
								<div class="edit-actions">
									<button class="btn-icon btn-save" on:click={saveEditAlias}>✓</button>
									<button class="btn-icon btn-cancel" on:click={cancelEditAlias}>✕</button>
								</div>
							{:else}
								<div class="url-alias-row">
									<div class="url-favicon-globe" style="--hue: {url.domainHue || 200}">
										<svg class="globe-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<circle class="globe-circle" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
											<path class="globe-line globe-line-1" d="M2 12h20" stroke="currentColor" stroke-width="1.5"/>
											<path class="globe-line globe-line-2" d="M12 2a8 8 0 0 1 0 20 8 8 0 0 1 0-20" stroke="currentColor" stroke-width="1.5"/>
										</svg>
									</div>
									<div class="url-alias">#{url.alias}</div>
									<span class="url-category-badge">{categoryMap[url.category]?.icon || '🔗'}</span>
								</div>
								<div class="url-meta">
									<span>{formatDate(url.createdAt)}</span>
									<span class="copy-count">{url.copyCount} copias</span>
								</div>
							{/if}
						</div>
						<div class="short-url-display">
							<span class="short-url-text">{url.shortUrl}</span>
						</div>
						<div class="original-url-ref">
							<span class="text-xs opacity-60">Original: {url.originalUrl}</span>
						</div>
						<div class="url-card-actions">
							<button class="btn-card-action btn-copy-main" class:copied={copiedId === url.id} on:click={() => copyUrl(url)}>
								{copiedId === url.id ? "✓ Copiado" : "📋 Copiar"}
							</button>
							<button class="btn-card-action" class:copied={copiedAliasId === url.id} on:click={() => copyAlias(url)}>
								{copiedAliasId === url.id ? "✓" : "🏷️"}
							</button>
							<button class="btn-card-action" on:click={() => showQRCode(url)}>📱</button>
							<button class="btn-card-action" on:click={() => startEditAlias(url)}>✏️</button>
							<button class="btn-card-action btn-delete" on:click={() => deleteUrl(url.id)}>🗑️</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<div class="url-shortener-footer">
			<div class="shortcuts-info">
				<span><kbd>Ctrl+E</kbd> Exportar</span>
				<span><kbd>Esc</kbd> Cerrar modal</span>
			</div>
			<div class="footer-info">
				{totalUrls}/{MAX_URLS} URLs guardados
				<span class="ad-free-badge">🔒 Sin publicidad · Enlaces limpios</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.url-shortener-wrapper {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		position: relative;
		color: #0f172a;
		transition: all 0.3s ease;
		font-family: inherit;
	}

	:global(.dark) .url-shortener-wrapper,
	.url-shortener-wrapper.dark {
		color: #e2e8f0;
	}

	.url-shortener-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.url-shortener-title {
		font-size: 2rem;
		font-weight: 700;
		background: linear-gradient(135deg, oklch(0.7 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-bottom: 0.25rem;
	}

	.url-shortener-subtitle {
		color: #475569;
		font-size: 1rem;
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
		font-size: 0.9rem;
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
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.btn-action {
		padding: 0.5rem 1rem;
		background: oklch(0.95 0.02 var(--hue));
		color: oklch(0.5 0.12 var(--hue));
		border: 1px solid oklch(0.85 0.05 var(--hue));
		border-radius: 0.75rem;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	:global(.dark) .btn-action,
	.dark .btn-action {
		background: oklch(0.3 0.03 var(--hue));
		color: oklch(0.75 0.14 var(--hue));
		border-color: oklch(0.4 0.05 var(--hue));
	}

	.btn-action:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px oklch(0.7 0.14 var(--hue) / 0.2);
	}

	.input-section {
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(10px);
		border-radius: 1.25rem;
		padding: 1.5rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
		border: 1px solid rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .input-section,
	.dark .input-section {
		background: rgba(30, 41, 59, 0.6);
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
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
	.select-category {
		padding: 0.75rem 1rem;
		border: 2px solid oklch(0.9 0.02 var(--hue));
		border-radius: 0.75rem;
		font-size: 1rem;
		background: white;
		color: #0f172a;
		transition: all 0.2s ease;
	}

	:global(.dark) .input-url,
	:global(.dark) .input-alias,
	:global(.dark) .select-category,
	.dark .input-url,
	.dark .input-alias,
	.dark .select-category {
		background: oklch(0.25 0.02 var(--hue));
		color: #e2e8f0;
		border-color: oklch(0.35 0.03 var(--hue));
	}

	.input-url:focus,
	.input-alias:focus,
	.select-category:focus {
		outline: none;
		border-color: oklch(0.7 0.14 var(--hue));
		box-shadow: 0 0 0 3px oklch(0.7 0.14 var(--hue) / 0.1);
	}

	.input-alias {
		min-width: 150px;
	}

	.select-category {
		min-width: 140px;
		cursor: pointer;
	}

	.btn-add {
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, oklch(0.7 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		color: white;
		border: none;
		border-radius: 0.75rem;
		font-weight: 700;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.btn-add:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px oklch(0.7 0.14 var(--hue) / 0.35);
	}

	.btn-add:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
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
		padding: 0.5rem 1rem;
		background: white;
		color: #475569;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	:global(.dark) .btn-category,
	.dark .btn-category {
		background: oklch(0.25 0.02 var(--hue));
		color: #cbd5e1;
		border-color: oklch(0.35 0.03 var(--hue));
	}

	.btn-category:hover {
		background: oklch(0.95 0.02 var(--hue));
		border-color: oklch(0.8 0.06 var(--hue));
		color: oklch(0.5 0.12 var(--hue));
		transform: translateY(-1px);
	}

	:global(.dark) .btn-category:hover,
	.dark .btn-category:hover {
		background: oklch(0.3 0.03 var(--hue));
		border-color: oklch(0.45 0.08 var(--hue));
		color: oklch(0.75 0.14 var(--hue));
	}

	.btn-category.active {
		background: linear-gradient(135deg, oklch(0.7 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		color: white;
		border-color: transparent;
		box-shadow: 0 4px 12px oklch(0.7 0.14 var(--hue) / 0.3);
	}

	.filter-section {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.input-search {
		flex: 1;
		min-width: 200px;
		padding: 0.75rem 1rem;
		border: 2px solid oklch(0.9 0.02 var(--hue));
		border-radius: 0.75rem;
		font-size: 1rem;
		background: white;
		color: #0f172a;
		transition: all 0.2s ease;
	}

	:global(.dark) .input-search,
	.dark .input-search {
		background: oklch(0.25 0.02 var(--hue));
		color: #e2e8f0;
		border-color: oklch(0.35 0.03 var(--hue));
	}

	.input-search:focus {
		outline: none;
		border-color: oklch(0.7 0.14 var(--hue));
		box-shadow: 0 0 0 3px oklch(0.7 0.14 var(--hue) / 0.1);
	}

	.sort-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.btn-sort {
		padding: 0.5rem 1rem;
		background: transparent;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	:global(.dark) .btn-sort,
	.dark .btn-sort {
		color: #cbd5e1;
		border-color: #475569;
	}

	.btn-sort:hover {
		background: oklch(0.95 0.02 var(--hue));
		border-color: oklch(0.8 0.06 var(--hue));
		color: oklch(0.5 0.12 var(--hue));
	}

	:global(.dark) .btn-sort:hover,
	.dark .btn-sort:hover {
		background: oklch(0.25 0.03 var(--hue));
		border-color: oklch(0.45 0.08 var(--hue));
		color: oklch(0.75 0.14 var(--hue));
	}

	.btn-sort.active {
		background: oklch(0.92 0.04 var(--hue));
		border-color: oklch(0.75 0.1 var(--hue));
		color: oklch(0.55 0.14 var(--hue));
	}

	:global(.dark) .btn-sort.active,
	.dark .btn-sort.active {
		background: oklch(0.28 0.04 var(--hue));
		border-color: oklch(0.5 0.1 var(--hue));
		color: oklch(0.75 0.14 var(--hue));
	}

	.urls-list {
		display: grid;
		gap: 1rem;
	}

	.urls-list.view-grid {
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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
	}

	.empty-state p {
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
	}

	.empty-hint {
		font-size: 0.9rem;
	}

	.url-card {
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(10px);
		border-radius: 1.25rem;
		padding: 1.25rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
		border: 1px solid rgba(0, 0, 0, 0.05);
		transition: all 0.2s ease;
	}

	:global(.dark) .url-card,
	.dark .url-card {
		background: rgba(30, 41, 59, 0.6);
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.url-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
	}

	:global(.dark) .url-card:hover,
	.dark .url-card:hover {
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
	}

	.url-card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.url-alias {
		font-size: 1.25rem;
		font-weight: 700;
		color: oklch(0.6 0.14 var(--hue));
	}

	:global(.dark) .url-alias,
	.dark .url-alias {
		color: oklch(0.7 0.14 var(--hue));
	}

	.url-alias-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.url-favicon-globe {
		position: relative;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border-radius: 10px;
		background: linear-gradient(
			135deg,
			hsla(var(--hue), 70%, 55%, 0.15),
			hsla(var(--hue), 65%, 50%, 0.08)
		);
		backdrop-filter: blur(10px);
		border: 1.5px solid hsla(var(--hue), 70%, 60%, 0.3);
		box-shadow: 
			0 2px 8px hsla(var(--hue), 70%, 50%, 0.2),
			inset 0 1px 0 hsla(var(--hue), 70%, 70%, 0.3);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.url-favicon-globe:hover {
		transform: translateY(-2px);
		box-shadow: 
			0 4px 16px hsla(var(--hue), 70%, 50%, 0.35),
			inset 0 1px 0 hsla(var(--hue), 70%, 70%, 0.4);
		border-color: hsla(var(--hue), 70%, 60%, 0.5);
	}

	:global(.dark) .url-favicon-globe,
	.dark .url-favicon-globe {
		background: linear-gradient(
			135deg,
			hsla(var(--hue), 70%, 45%, 0.2),
			hsla(var(--hue), 65%, 40%, 0.12)
		);
		border-color: hsla(var(--hue), 70%, 50%, 0.4);
		box-shadow: 
			0 2px 12px hsla(var(--hue), 70%, 40%, 0.3),
			inset 0 1px 0 hsla(var(--hue), 70%, 60%, 0.2);
	}

	:global(.dark) .url-favicon-globe:hover,
	.dark .url-favicon-globe:hover {
		box-shadow: 
			0 4px 20px hsla(var(--hue), 70%, 40%, 0.5),
			inset 0 1px 0 hsla(var(--hue), 70%, 60%, 0.3);
	}

	.globe-icon {
		width: 22px;
		height: 22px;
		color: hsl(var(--hue), 70%, 55%);
		filter: drop-shadow(0 1px 2px hsla(var(--hue), 70%, 30%, 0.3));
	}

	:global(.dark) .globe-icon,
	.dark .globe-icon {
		color: hsl(var(--hue), 70%, 65%);
	}

	/* Animación sutil del círculo principal */
	.globe-circle {
		animation: globePulse 3s ease-in-out infinite;
		transform-origin: center;
	}

	@keyframes globePulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	/* Animación de líneas del globo */
	.globe-line {
		animation: lineFloat 4s ease-in-out infinite;
	}

	.globe-line-1 {
		animation-delay: 0s;
	}

	.globe-line-2 {
		animation-delay: 0.5s;
	}

	@keyframes lineFloat {
		0%, 100% {
			opacity: 1;
			stroke-dasharray: 0, 100;
		}
		50% {
			opacity: 0.8;
			stroke-dasharray: 10, 90;
		}
	}

	.url-category-badge {
		font-size: 1rem;
		opacity: 0.7;
	}

	.url-meta {
		display: flex;
		gap: 1rem;
		font-size: 0.85rem;
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
		margin-bottom: 0.5rem;
	}

	.short-url-text {
		color: oklch(0.6 0.14 var(--hue));
		font-size: 1.05rem;
		font-weight: 600;
		word-break: break-all;
		line-height: 1.5;
	}

	:global(.dark) .short-url-text,
	.dark .short-url-text {
		color: oklch(0.75 0.14 var(--hue));
	}

	.original-url-ref {
		margin-bottom: 1rem;
	}

	.original-url-ref .text-xs {
		font-size: 0.85rem;
		color: #64748b;
		word-break: break-all;
		line-height: 1.4;
	}

	.original-url-ref .opacity-60 {
		opacity: 0.6;
	}

	:global(.dark) .original-url-ref .text-xs,
	.dark .original-url-ref .text-xs {
		color: #94a3b8;
	}

	.url-card-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.btn-card-action {
		padding: 0.5rem 1rem;
		background: oklch(0.97 0.01 var(--hue));
		color: oklch(0.5 0.12 var(--hue));
		border: 1px solid oklch(0.9 0.02 var(--hue));
		border-radius: 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	:global(.dark) .btn-card-action,
	.dark .btn-card-action {
		background: oklch(0.2 0.02 var(--hue));
		color: oklch(0.75 0.14 var(--hue));
		border-color: oklch(0.3 0.03 var(--hue));
	}

	.btn-card-action:hover {
		background: oklch(0.7 0.14 var(--hue));
		color: white;
		transform: translateY(-1px);
	}

	.btn-card-action.copied {
		background: oklch(0.6 0.15 150);
		color: white;
		border-color: oklch(0.6 0.15 150);
	}

	.btn-card-action.btn-delete:hover {
		background: oklch(0.65 0.18 25);
		border-color: oklch(0.65 0.18 25);
	}

	.input-edit-alias {
		padding: 0.5rem 0.75rem;
		border: 2px solid oklch(0.7 0.14 var(--hue));
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 700;
		background: white;
		color: #0f172a;
	}

	:global(.dark) .input-edit-alias,
	.dark .input-edit-alias {
		background: oklch(0.25 0.02 var(--hue));
		color: #e2e8f0;
	}

	.edit-actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-icon {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 0.5rem;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-save {
		background: oklch(0.6 0.15 150);
		color: white;
	}

	.btn-cancel {
		background: #cbd5e1;
		color: #0f172a;
	}

	.url-shortener-qr-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(12px);
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		animation: fadeIn 0.3s ease;
	}

	.url-shortener-qr-card {
		max-width: 400px;
		background: rgba(255, 255, 255, 0.98);
		border-radius: 1.25rem;
		padding: 2rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.3);
		animation: scaleIn 0.3s ease;
		text-align: center;
	}

	:global(.dark) .url-shortener-qr-card,
	.dark .url-shortener-qr-card {
		background: rgba(15, 23, 42, 0.98);
		border-color: rgba(148, 163, 184, 0.2);
	}

	.url-shortener-qr-card h3 {
		font-size: 1.5rem;
		margin-bottom: 1.5rem;
		color: #0f172a;
	}

	:global(.dark) .url-shortener-qr-card h3,
	.dark .url-shortener-qr-card h3 {
		color: #e2e8f0;
	}

	.qr-container {
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
		padding: 1rem;
		background: white;
		border-radius: 0.75rem;
	}

	.qr-container img {
		width: 200px;
		height: 200px;
	}

	.qr-url {
		color: #64748b;
		font-size: 0.85rem;
		word-break: break-all;
		margin-bottom: 1.5rem;
	}

	:global(.dark) .qr-url,
	.dark .qr-url {
		color: #94a3b8;
	}

	.btn-close-qr {
		padding: 0.75rem 2rem;
		background: oklch(0.7 0.14 var(--hue));
		color: white;
		border: none;
		border-radius: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-close-qr:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px oklch(0.7 0.14 var(--hue) / 0.35);
	}

	.url-shortener-onboarding-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(12px);
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		animation: fadeIn 0.4s ease;
	}

	.url-shortener-onboarding-card {
		max-width: 640px;
		background: rgba(255, 255, 255, 0.98);
		border-radius: 1.5rem;
		padding: 2.5rem;
		box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.2);
		display: grid;
		gap: 1.5rem;
		animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
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
		gap: 0.5rem;
		opacity: 0;
		animation: fadeInUp 0.5s ease forwards;
	}

	.onboarding-step:nth-child(1) {
		animation-delay: 0.1s;
	}
	.onboarding-step:nth-child(2) {
		animation-delay: 0.2s;
	}
	.onboarding-step:nth-child(3) {
		animation-delay: 0.3s;
	}

	.step-icon {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.onboarding-step h3 {
		font-size: 1.25rem;
		font-weight: 700;
		color: #0f172a;
	}

	:global(.dark) .onboarding-step h3,
	.dark .onboarding-step h3 {
		color: #e2e8f0;
	}

	.onboarding-step p {
		color: #475569;
		line-height: 1.5;
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
		padding: 0.85rem 2rem;
		font-weight: 700;
		font-size: 1.05rem;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.3s ease;
		box-shadow: 0 8px 20px oklch(0.7 0.14 var(--hue) / 0.35);
		animation: fadeInUp 0.5s ease forwards 0.4s;
		opacity: 0;
	}

	.btn-onboarding:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 28px oklch(0.7 0.14 var(--hue) / 0.45);
	}

	.url-shortener-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 1rem;
		border-top: 1px solid #e2e8f0;
		font-size: 0.85rem;
		color: #64748b;
		flex-wrap: wrap;
		gap: 1rem;
	}

	:global(.dark) .url-shortener-footer,
	.dark .url-shortener-footer {
		border-color: #334155;
		color: #94a3b8;
	}

	.shortcuts-info {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	kbd {
		padding: 0.25rem 0.5rem;
		background: oklch(0.94 0.01 var(--hue));
		border: 1px solid oklch(0.85 0.02 var(--hue));
		border-radius: 0.25rem;
		font-family: monospace;
		font-size: 0.8rem;
	}

	:global(.dark) kbd,
	.dark kbd {
		background: oklch(0.25 0.02 var(--hue));
		border-color: oklch(0.35 0.03 var(--hue));
	}

	.footer-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
	}

	.ad-free-badge {
		font-size: 0.75rem;
		color: #10b981;
		font-weight: 500;
		opacity: 0.9;
	}

	:global(.dark) .ad-free-badge,
	.dark .ad-free-badge {
		color: #34d399;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
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
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

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
		font-size: 0.95rem;
		box-shadow: 0 8px 32px oklch(0.7 0.14 var(--hue) / 0.3);
		z-index: 1000;
		pointer-events: none;
		animation: slideInUp 0.3s ease, fadeOut 0.3s ease 2.7s;
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
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}

	.btn-copy-main {
		background: linear-gradient(135deg, oklch(0.7 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30))) !important;
		color: white !important;
		font-weight: 600;
	}

	.btn-copy-main:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px oklch(0.7 0.14 var(--hue) / 0.3);
	}

	.btn-copy-main.copied {
		background: #10b981 !important;
	}

	.btn-download-qr {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, oklch(0.7 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		color: white;
		border-radius: 0.75rem;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.btn-download-qr:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px oklch(0.7 0.14 var(--hue) / 0.3);
	}

	.qr-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
	}

	.info-section {
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(10px);
		border-radius: 1.25rem;
		padding: 1.5rem;
		border: 1px solid rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .info-section,
	.dark .info-section {
		background: rgba(30, 41, 59, 0.6);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.info-section h3 {
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: 1rem;
		color: oklch(0.6 0.14 var(--hue));
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
		margin-bottom: 0.25rem;
	}

	.info-item p {
		font-size: 0.85rem;
		color: #64748b;
		margin: 0;
	}

	:global(.dark) .info-item p,
	.dark .info-item p {
		color: #94a3b8;
	}
</style>
