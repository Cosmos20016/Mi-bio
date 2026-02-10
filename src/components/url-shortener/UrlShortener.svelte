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
	alias: string;
	createdAt: string;
	copyCount: number;
}

// Core state
let urls: ShortenedUrl[] = [];
let inputUrl = "";
let inputAlias = "";
let searchQuery = "";
let showQR = false;
let qrUrl = "";
let qrAlias = "";
let copiedId: string | null = null;
let sortBy: "date" | "copies" | "name" = "date";
let isDark = false;
let isReady = false;
let showOnboarding = false;
let editingId: string | null = null;
let editingAlias = "";

// Dark mode
let darkModeObserver: MutationObserver | null = null;
let stopThemeWatch: (() => void) | null = null;

// Max URLs to store
const MAX_URLS = 100;

// Load URLs from localStorage
const loadUrls = () => {
	try {
		const stored = localStorage.getItem(storageKey);
		if (stored) {
			urls = JSON.parse(stored);
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
	let hash = 0;
	for (let i = 0; i < url.length; i++) {
		hash = (hash << 5) - hash + url.charCodeAt(i);
		hash = hash & hash;
	}
	return Math.abs(hash).toString(36).substring(0, 6);
};

// Validate URL
const isValidUrl = (url: string): boolean => {
	try {
		new URL(url);
		return true;
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

// Add URL
const addUrl = () => {
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

	// Check max URLs
	if (urls.length >= MAX_URLS) {
		alert(`Máximo ${MAX_URLS} URLs permitidos`);
		return;
	}

	const newUrl: ShortenedUrl = {
		id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
		originalUrl: normalized,
		alias,
		createdAt: new Date().toISOString(),
		copyCount: 0,
	};

	urls = [newUrl, ...urls];
	saveUrls();

	// Clear inputs
	inputUrl = "";
	inputAlias = "";
};

// Copy URL to clipboard
const copyUrl = (url: ShortenedUrl) => {
	navigator.clipboard.writeText(url.originalUrl).then(() => {
		// Increment copy count
		urls = urls.map((u) =>
			u.id === url.id ? { ...u, copyCount: u.copyCount + 1 } : u,
		);
		saveUrls();

		// Show feedback
		copiedId = url.id;
		setTimeout(() => {
			copiedId = null;
		}, 2000);
	});
};

// Delete URL
const deleteUrl = (id: string) => {
	if (confirm("¿Eliminar este URL?")) {
		urls = urls.filter((u) => u.id !== id);
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

	urls = urls.map((u) =>
		u.id === editingId ? { ...u, alias: newAlias } : u,
	);
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
	.filter(
		(u) =>
			u.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
			u.originalUrl.toLowerCase().includes(searchQuery.toLowerCase()),
	)
	.sort((a, b) => {
		if (sortBy === "date") {
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		}
		if (sortBy === "copies") {
			return b.copyCount - a.copyCount;
		}
		// name
		return a.alias.localeCompare(b.alias);
	});

// Statistics
$: totalUrls = urls.length;
$: totalCopies = urls.reduce((sum, u) => sum + u.copyCount, 0);
$: mostCopiedUrl = urls.reduce(
	(max, u) => (u.copyCount > max.copyCount ? u : max),
	{ alias: "N/A", copyCount: 0 } as ShortenedUrl,
);

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
	if (event.target && (event.target as HTMLElement).tagName === "INPUT")
		return;

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
					<button class="btn-close-qr" on:click={closeQR}>Cerrar</button>
				</div>
			</div>
		{/if}

		<!-- Header -->
		<div class="url-shortener-header">
			<div>
				<h2 class="url-shortener-title">Acortador de URLs</h2>
				<p class="url-shortener-subtitle">
					Organiza, acorta y gestiona tus enlaces favoritos
				</p>
				<div class="stats-row">
					<span class="stat-item">{totalUrls} URLs</span>
					<span class="stat-item">{totalCopies} copias totales</span>
					{#if mostCopiedUrl.alias !== "N/A"}
						<span class="stat-item"
							>Más copiado: {mostCopiedUrl.alias} ({mostCopiedUrl.copyCount})</span
						>
					{/if}
				</div>
			</div>

			<div class="header-actions">
				<button class="btn-action" on:click={exportUrls}>
					📤 Exportar
				</button>
				<button class="btn-action" on:click={importUrls}>
					📥 Importar
				</button>
			</div>
		</div>

		<!-- Input Section -->
		<div class="input-section">
			<div class="input-row">
				<input
					type="text"
					bind:value={inputUrl}
					placeholder="Pega tu URL largo aquí..."
					class="input-url"
					on:keydown={(e) => e.key === "Enter" && addUrl()}
				/>
				<input
					type="text"
					bind:value={inputAlias}
					placeholder="Alias (opcional)"
					class="input-alias"
					on:keydown={(e) => e.key === "Enter" && addUrl()}
				/>
				<button class="btn-add" on:click={addUrl}>Acortar</button>
			</div>
			<p class="input-hint">
				Sin alias, se genera uno automático. Ej: "mi-video", "blog-post"
			</p>
		</div>

		<!-- Search and Filter -->
		<div class="filter-section">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="🔍 Buscar por alias o URL..."
				class="input-search"
			/>
			<div class="sort-buttons">
				<button
					class="btn-sort"
					class:active={sortBy === "date"}
					on:click={() => (sortBy = "date")}
				>
					📅 Fecha
				</button>
				<button
					class="btn-sort"
					class:active={sortBy === "copies"}
					on:click={() => (sortBy = "copies")}
				>
					📊 Copias
				</button>
				<button
					class="btn-sort"
					class:active={sortBy === "name"}
					on:click={() => (sortBy = "name")}
				>
					🔤 Nombre
				</button>
			</div>
		</div>

		<!-- URLs List -->
		<div class="urls-list">
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
								<input
									type="text"
									bind:value={editingAlias}
									class="input-edit-alias"
									on:keydown={(e) => {
										if (e.key === "Enter") saveEditAlias();
										if (e.key === "Escape") cancelEditAlias();
									}}
									autofocus
								/>
								<div class="edit-actions">
									<button class="btn-icon btn-save" on:click={saveEditAlias}>
										✓
									</button>
									<button class="btn-icon btn-cancel" on:click={cancelEditAlias}>
										✕
									</button>
								</div>
							{:else}
								<div class="url-alias">#{url.alias}</div>
								<div class="url-meta">
									<span>{formatDate(url.createdAt)}</span>
									<span class="copy-count">{url.copyCount} copias</span>
								</div>
							{/if}
						</div>
						<div class="url-original">{url.originalUrl}</div>
						<div class="url-card-actions">
							<button
								class="btn-card-action"
								class:copied={copiedId === url.id}
								on:click={() => copyUrl(url)}
							>
								{copiedId === url.id ? "✓ Copiado" : "📋 Copiar"}
							</button>
							<button class="btn-card-action" on:click={() => showQRCode(url)}>
								📱 QR
							</button>
							<button
								class="btn-card-action"
								on:click={() => startEditAlias(url)}
							>
								✏️ Editar
							</button>
							<button
								class="btn-card-action btn-delete"
								on:click={() => deleteUrl(url.id)}
							>
								🗑️
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Footer -->
		<div class="url-shortener-footer">
			<div class="shortcuts-info">
				<span><kbd>Ctrl+E</kbd> Exportar</span>
				<span><kbd>Esc</kbd> Cerrar modal</span>
			</div>
			<div class="footer-info">
				{totalUrls}/{MAX_URLS} URLs guardados
			</div>
		</div>
	</div>
{/if}

<style>
	/* Base wrapper */
	.url-shortener-wrapper {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		position: relative;
		color: #0f172a;
		transition: all 0.3s ease;
	}

	:global(.dark) .url-shortener-wrapper,
	.url-shortener-wrapper.dark {
		color: #e2e8f0;
	}

	/* Header */
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
		background: linear-gradient(
			135deg,
			oklch(0.7 0.14 var(--hue)),
			oklch(0.65 0.16 calc(var(--hue) + 30))
		);
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

	/* Input Section */
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
		grid-template-columns: 1fr auto auto;
		gap: 0.75rem;
	}

	@media (max-width: 768px) {
		.input-row {
			grid-template-columns: 1fr;
		}
	}

	.input-url,
	.input-alias {
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
	.dark .input-url,
	.dark .input-alias {
		background: oklch(0.25 0.02 var(--hue));
		color: #e2e8f0;
		border-color: oklch(0.35 0.03 var(--hue));
	}

	.input-url:focus,
	.input-alias:focus {
		outline: none;
		border-color: oklch(0.7 0.14 var(--hue));
		box-shadow: 0 0 0 3px oklch(0.7 0.14 var(--hue) / 0.1);
	}

	.input-alias {
		min-width: 150px;
	}

	.btn-add {
		padding: 0.75rem 1.5rem;
		background: linear-gradient(
			135deg,
			oklch(0.7 0.14 var(--hue)),
			oklch(0.65 0.16 calc(var(--hue) + 30))
		);
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

	.input-hint {
		margin-top: 0.75rem;
		font-size: 0.85rem;
		color: #64748b;
	}

	:global(.dark) .input-hint,
	.dark .input-hint {
		color: #94a3b8;
	}

	/* Filter Section */
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

	/* URLs List */
	.urls-list {
		display: grid;
		gap: 1rem;
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

	.url-original {
		color: #475569;
		font-size: 0.95rem;
		word-break: break-all;
		margin-bottom: 1rem;
		line-height: 1.5;
	}

	:global(.dark) .url-original,
	.dark .url-original {
		color: #cbd5e1;
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

	/* Edit alias */
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

	/* QR Modal */
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

	/* Onboarding */
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
		background: linear-gradient(
			135deg,
			oklch(0.7 0.14 var(--hue)),
			oklch(0.65 0.16 calc(var(--hue) + 30))
		);
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

	/* Footer */
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

	/* Animations */
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
</style>
