<script lang="ts">
	import {
		applyStoredThemeToDocument,
		getStoredTheme,
		watchSystemThemeChanges,
	} from "@utils/setting-utils.ts";
	import { onDestroy, onMount } from "svelte";

	const storageKey = "teleprompter:state:v4";
	const scriptsKey = "teleprompter:scripts";
	const lastScriptKey = "teleprompter:lastScript";
	const onboardingKey = "teleprompter:onboarding:done";

	// Core state
	let text = `Pega aquí tu guion...

Tip: Usa párrafos cortos para una lectura más cómoda.`;
	let speed = 60;
	let fontSize = 34;
	let lineHeight = 1.6;
	let isPlaying = false;
	let isMirror = false;
	let autoCenter = true;
	let smooth = true;
	let showControls = true;
	let progress = 0;
	let glow = true;
	let focusMode = false;
	let dimOutside = true;
	let isFullscreen = false;
	let isMobile = false;
	let showMobileBanner = false;
	let isReady = false;
	let ultraClean = false;
	let countdown = 0;
	let isCountingDown = false;
	let showOnboarding = false;
	let helpTab: "quickstart" | "youtube" | "shortcuts" | "tips" = "quickstart";
	let currentScript: string | null = null;
	let countdownDuration = 3;

	// Dark mode reactive detection
	let isDark = false;

	// Refs (aceptan null por SSR)
	let scrollContainer: HTMLDivElement | null = null;
	let content: HTMLDivElement | null = null;
	let fullscreenTarget: HTMLDivElement | null = null;
	let raf: number | null = null;
	let lastTime: number | null = null;
	let observer: IntersectionObserver | null = null;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let stopThemeWatch: (() => void) | null = null;
	let countdownTimer: ReturnType<typeof setInterval> | null = null;
	let darkModeObserver: MutationObserver | null = null;
	let lineElements: Array<HTMLParagraphElement | null> = [];
	let activeLineIndex = 0;
	let lines: string[] = [];

	const speedMin = 10;
	const speedMax = 400;
	let targetSpeed = speed;
	let currentSpeed = 0;
	let cachedMaxScroll = 0;

	let touchStartY = 0;
	let lastTapTime = 0;
	const TAP_THRESHOLD = 280;
	const SWIPE_THRESHOLD = 25;

	const clamp = (value: number, min: number, max: number) =>
		Math.min(Math.max(value, min), max);

	$: lines = text.split("\n");
	$: if (lineElements.length !== lines.length) {
		lineElements = lines.map((_, i) => lineElements[i] || null);
	}

	$: wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
	$: charCount = text.length;
	$: estimatedMinutes = wordCount > 0 ? Math.floor(wordCount / 150) : 0;
	$: estimatedSeconds =
		wordCount > 0 ? Math.ceil((wordCount / 150) * 60) % 60 : 0;
	$: readingTimeLabel =
		wordCount > 0
			? estimatedMinutes > 0
				? `~${estimatedMinutes}m ${estimatedSeconds}s`
				: `~${estimatedSeconds}s`
			: "";

	const recomputeMaxScroll = () => {
		if (!scrollContainer || !content) {
		cachedMaxScroll = 0;
		return;
		}
		cachedMaxScroll = Math.max(
		content.scrollHeight - scrollContainer.clientHeight,
		0,
		);
	};

	const updateProgress = () => {
		if (!scrollContainer || !content) return;
		progress =
		cachedMaxScroll <= 0
		? 0
		: clamp(scrollContainer.scrollTop / cachedMaxScroll, 0, 1);
		updateActiveLine();
	};

	const getFocusCenter = () => {
		if (!scrollContainer) return 0;
		const viewport = scrollContainer.clientHeight;
		const focusOffset = focusMode ? viewport * 0.45 + 50 : viewport / 2;
		return scrollContainer.scrollTop + focusOffset;
	};

	const updateActiveLine = () => {
		if (!scrollContainer || !lineElements.length) return;
		const focusCenter = getFocusCenter();
		let closestIndex = 0;
		let closestDistance = Number.POSITIVE_INFINITY;
		for (let index = 0; index < lineElements.length; index++) {
		const line = lineElements[index];
		if (!line) continue;
		const lineCenter = line.offsetTop + line.offsetHeight / 2;
		const distance = Math.abs(lineCenter - focusCenter);
		if (distance < closestDistance) {
		closestDistance = distance;
		closestIndex = index;
		}
		}
		activeLineIndex = closestIndex;
	};

	// ✅ FIX 1: el tick se separa del bucle de progreso.
	// El scroll se aplica de forma imperativa y la velocidad se actualiza en vivo.
	const tick = (timestamp: number) => {
		if (!isPlaying || !scrollContainer) {
		raf = null;
		lastTime = null;
		return;
		}

		if (lastTime === null) {
		lastTime = timestamp;
		raf = requestAnimationFrame(tick);
		return;
		}

		const elapsed = timestamp - lastTime;
		if (elapsed <= 0) {
		raf = requestAnimationFrame(tick);
		return;
		}
		// Clamp para evitar saltos enormes al volver de background tab
		const delta = Math.min(elapsed / 1000, 0.05);
		lastTime = timestamp;

		// ✅ FIX 2: suavizado controlado, sin que la velocidad "muera"
		if (smooth) {
		const k = 1 - Math.exp(-delta * 8);
		currentSpeed += (targetSpeed - currentSpeed) * k;
		if (Math.abs(currentSpeed - targetSpeed) < 0.3) {
		currentSpeed = targetSpeed;
		}
		} else {
		currentSpeed = targetSpeed;
		}

		const next = scrollContainer.scrollTop + currentSpeed * delta;

		if (next >= cachedMaxScroll) {
		scrollContainer.scrollTop = cachedMaxScroll;
		progress = 1;
		updateActiveLine();
		stop();
		return;
		}

		scrollContainer.scrollTop = next;
		raf = requestAnimationFrame(tick);
	};

	const startRAF = () => {
		if (raf) cancelAnimationFrame(raf);
		lastTime = null;
		raf = requestAnimationFrame(tick);
	};

	const stop = () => {
		isPlaying = false;
		if (raf) {
		cancelAnimationFrame(raf);
		raf = null;
		}
		lastTime = null;
		currentSpeed = 0;
		updateProgress();
	};

	const startPlayback = () => {
		if (!scrollContainer || !content) return;
		recomputeMaxScroll();
		if (cachedMaxScroll <= 0) return;

		// sincronizar la velocidad efectiva con la deseada antes de arrancar
		currentSpeed = smooth ? currentSpeed : targetSpeed;

		isPlaying = true;
		startRAF();
	};

	const cancelCountdown = () => {
		if (countdownTimer) clearInterval(countdownTimer);
		countdownTimer = null;
		countdown = 0;
		isCountingDown = false;
	};

	const beginCountdown = () => {
		if (isCountingDown) return;
		if (countdownDuration <= 0) {
		startPlayback();
		return;
		}
		cancelCountdown();
		countdown = countdownDuration;
		isCountingDown = true;
		countdownTimer = setInterval(() => {
		countdown -= 1;
		if (countdown <= 0) {
		cancelCountdown();
		startPlayback();
		}
		}, 1000);
	};

	const start = () => {
		if (isPlaying || isCountingDown) return;
		beginCountdown();
	};

	const pause = () => {
		cancelCountdown();
		stop();
	};

	const toggle = () => {
		if (isPlaying) {
		pause();
		} else if (isCountingDown) {
		cancelCountdown();
		} else {
		start();
		}
	};

	const reset = () => {
		pause();
		if (scrollContainer) {
		scrollContainer.scrollTop = 0;
		progress = 0;
		}
		updateProgress();
	};

	const clearText = () => {
		pause();
		text = "";
		if (scrollContainer) {
		scrollContainer.scrollTop = 0;
		progress = 0;
		}
		updateProgress();
	};

	const jump = (amount: number) => {
		if (!scrollContainer || !content) return;
		const next = scrollContainer.scrollTop + amount;
		scrollContainer.scrollTop = clamp(next, 0, cachedMaxScroll);
		updateProgress();
	};

	const scrollToProgress = (value: number) => {
		if (!scrollContainer) return;
		const v = clamp(value, 0, 1);
		scrollContainer.scrollTop = v * cachedMaxScroll;
		updateProgress();
	};

	const toggleFullscreen = async () => {
		if (!fullscreenTarget) return;
		try {
		if (!document.fullscreenElement) {
		await fullscreenTarget.requestFullscreen();
		} else {
		await document.exitFullscreen();
		}
		} catch (e) {
		console.warn("[Teleprompter] Fullscreen no disponible:", e);
		}
	};

	// ✅ FIX 3: handler pasivo=false para que preventDefault funcione en la rueda
	const handleWheel = (event: WheelEvent) => {
		if (!isPlaying) return;
		event.preventDefault();
		const baseIncrement = Math.max(5, speed * 0.08);
		const delta = event.deltaY > 0 ? baseIncrement : -baseIncrement;
		adjustSpeed(delta);
	};

	const adjustSpeed = (amount: number) => {
		const next = Math.round(clamp(speed + amount, speedMin, speedMax));
		speed = next;
		targetSpeed = next;
	};

	// ✅ FIX 4: cambio de velocidad en vivo, sin reiniciar nada
	const onSpeedInput = () => {
		const next = Math.round(clamp(speed, speedMin, speedMax));
		speed = next;
		targetSpeed = next;
	};

	const loadState = () => {
		try {
		const raw = localStorage.getItem(storageKey);
		if (!raw) return;
		const data = JSON.parse(raw);
		if (typeof data !== "object" || data === null) return;

		if (typeof data.text === "string") text = data.text;
		if (typeof data.speed === "number") speed = data.speed;
		if (typeof data.fontSize === "number") fontSize = data.fontSize;
		if (typeof data.lineHeight === "number") lineHeight = data.lineHeight;
		if (typeof data.isMirror === "boolean") isMirror = data.isMirror;
		if (typeof data.autoCenter === "boolean") autoCenter = data.autoCenter;
		if (typeof data.smooth === "boolean") smooth = data.smooth;
		if (typeof data.glow === "boolean") glow = data.glow;
		if (typeof data.focusMode === "boolean") focusMode = data.focusMode;
		if (typeof data.dimOutside === "boolean") dimOutside = data.dimOutside;
		if (typeof data.ultraClean === "boolean") ultraClean = data.ultraClean;
		if (typeof data.countdownDuration === "number")
		countdownDuration = data.countdownDuration;

		speed = Math.round(clamp(speed, speedMin, speedMax));
		targetSpeed = speed;
		} catch (e) {
		console.warn("[Teleprompter] Estado corrupto, usando defaults:", e);
		try {
		localStorage.removeItem(storageKey);
		} catch {}
		}
	};

	const scheduleSave = () => {
		if (!isReady) return;
		if (saveTimeout) clearTimeout(saveTimeout);
		const delay = text.length > 5000 ? 600 : 350;
		saveTimeout = setTimeout(() => {
		try {
		const payload = {
		text, speed, fontSize, lineHeight,
		isMirror, autoCenter, smooth, glow,
		focusMode, dimOutside, ultraClean, countdownDuration,
		};
		localStorage.setItem(storageKey, JSON.stringify(payload));
		} catch (e) {
		console.warn("[Teleprompter] Error al guardar:", e);
		}
		}, delay);
	};

	interface SavedScript {
		id: string;
		name: string;
		text: string;
		createdAt: string;
		updatedAt: string;
	}

	let scripts: SavedScript[] = [];

	const loadScripts = () => {
		try {
		const raw = localStorage.getItem(scriptsKey);
		if (!raw) {
		scripts = [];
		return;
		}
		const data = JSON.parse(raw);
		if (Array.isArray(data)) scripts = data;
		else scripts = [];
		} catch (e) {
		console.warn("[Teleprompter] Scripts corruptos:", e);
		scripts = [];
		try {
		localStorage.removeItem(scriptsKey);
		} catch {}
		}
	};

	const saveScripts = (scriptsToSave: SavedScript[]) => {
		try {
		localStorage.setItem(scriptsKey, JSON.stringify(scriptsToSave));
		scripts = scriptsToSave;
		} catch (e) {
		console.warn("[Teleprompter] No se pudieron guardar scripts:", e);
		}
	};

	const saveCurrentScript = () => {
		if (!text.trim()) return;
		const now = new Date().toISOString();

		if (currentScript) {
		const index = scripts.findIndex((s) => s.id === currentScript);
		if (index >= 0) {
		scripts[index].text = text;
		scripts[index].updatedAt = now;
		saveScripts([...scripts]);
		return;
		}
		}

		const newScript: SavedScript = {
		id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
		name: `Guion ${scripts.length + 1}`,
		text,
		createdAt: now,
		updatedAt: now,
		};
		const updated = [newScript, ...scripts].slice(0, 20);
		saveScripts(updated);
		currentScript = newScript.id;
		try {
		localStorage.setItem(lastScriptKey, currentScript);
		} catch {}
	};

	const loadScript = (id: string) => {
		const script = scripts.find((s) => s.id === id);
		if (script) {
		text = script.text;
		currentScript = id;
		try {
		localStorage.setItem(lastScriptKey, id);
		} catch {}
		}
	};

	const deleteScript = (id: string) => {
		const updated = scripts.filter((s) => s.id !== id);
		saveScripts(updated);
		if (currentScript === id) {
		currentScript = null;
		text = "";
		try {
		localStorage.removeItem(lastScriptKey);
		} catch {}
		}
	};

	const newScript = () => {
		currentScript = null;
		text = "";
		try {
		localStorage.removeItem(lastScriptKey);
		} catch {}
	};

	const getSpeedLabel = (spd: number): string => {
		if (spd < 40) return "Muy lento";
		if (spd < 80) return "Lento";
		if (spd < 150) return "Normal";
		if (spd < 250) return "Rápido";
		return "Muy rápido";
	};

	const getStatus = (): string => {
		if (isPlaying) return "Al aire 🔴";
		if (isCountingDown) return "Cuenta regresiva...";
		if (progress >= 0.999) return "Fin de guion ✓";
		if (progress > 0) return "En pausa ⏸";
		return "En línea";
	};

	const getStatusColor = (): string => {
		if (isPlaying) return "oklch(0.62 0.18 220)";
		if (isCountingDown) return "oklch(0.70 0.18 60)";
		if (progress >= 0.999) return "oklch(0.55 0.05 var(--hue))";
		return "oklch(0.62 0.18 150)";
	};

	const getSpeedColor = (): string => {
		const ratio = (speed - speedMin) / (speedMax - speedMin);
		if (ratio < 0.33) return "oklch(0.68 0.16 150)";
		if (ratio < 0.66) return "oklch(0.72 0.16 60)";
		return "oklch(0.68 0.20 25)";
	};

	const formatRelativeTime = (isoDate: string): string => {
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

	const formatDateTime = (isoDate: string): string => {
		const date = new Date(isoDate);
		return date.toLocaleDateString("es-ES", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
		});
	};

	const applyYouTubeSettings = () => {
		speed = 60;
		fontSize = 40;
		lineHeight = 1.75;
		isMirror = false;
		focusMode = true;
		autoCenter = true;
		countdownDuration = 3;
		targetSpeed = speed;
		scheduleSave();
	};

	const getEstimatedTimeRemaining = (): string => {
		if (!scrollContainer || speed <= 0) return "";
		const remaining = cachedMaxScroll - scrollContainer.scrollTop;
		if (remaining <= 0) return "0:00";
		const seconds = Math.ceil(remaining / speed);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${minutes}:${secs.toString().padStart(2, "0")}`;
	};

	const handleTouchStart = (e: TouchEvent) => {
		if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
		if ((e.target as HTMLElement)?.closest("button")) return;
		touchStartY = e.touches[0].clientY;
	};

	const handleTouchMove = (e: TouchEvent) => {
		if (!isPlaying) return;
		const target = e.target as HTMLElement;
		if (target?.tagName === "TEXTAREA") return;
		if (target?.closest("button")) return;

		const deltaY = touchStartY - e.touches[0].clientY;
		if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
		const speedAdjustment =
		Math.sign(deltaY) * Math.max(2, Math.abs(deltaY) / 12);
		adjustSpeed(speedAdjustment);
		touchStartY = e.touches[0].clientY;
		}
	};

	const handleFrameClick = (e: MouseEvent) => {
		const target = e.target as HTMLElement;
		if (!target) return;
		if (target.tagName === "TEXTAREA") return;
		if (target.closest(".teleprompter-panel")) return;
		if (target.closest(".teleprompter-float")) return;
		if (target.closest(".teleprompter-progress-top")) return;

		const now = Date.now();
		if (now - lastTapTime < TAP_THRESHOLD) {
		toggleFullscreen();
		lastTapTime = 0;
		} else {
		lastTapTime = now;
		setTimeout(() => {
		if (lastTapTime !== 0) {
		toggle();
		lastTapTime = 0;
		}
		}, TAP_THRESHOLD);
		}
	};

	const onKey = (event: KeyboardEvent) => {
		const t = event.target as HTMLElement | null;
		if (t && (t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.tagName === "INPUT")) {
		if (t.tagName !== "INPUT" || (t as HTMLInputElement).type === "range") {
		// Permitir atajos incluso con range enfocado
		if (t.tagName === "TEXTAREA") return;
		}
		}

		const shift = event.shiftKey;
		switch (event.code) {
		case "Space":
		case "Enter":
		case "NumpadEnter":
		event.preventDefault();
		toggle();
		break;
		case "ArrowUp":
		event.preventDefault();
		if (shift) adjustSpeed(1);
		else if (isPlaying) adjustSpeed(10);
		else jump(-120);
		break;
		case "ArrowDown":
		event.preventDefault();
		if (shift) adjustSpeed(-1);
		else if (isPlaying) adjustSpeed(-10);
		else jump(120);
		break;
		case "PageUp":
		event.preventDefault();
		jump(-320);
		break;
		case "PageDown":
		event.preventDefault();
		jump(320);
		break;
		case "KeyM":
		event.preventDefault();
		isMirror = !isMirror;
		break;
		case "KeyF":
		event.preventDefault();
		focusMode = !focusMode;
		break;
		case "KeyR":
		event.preventDefault();
		reset();
		break;
		case "KeyX":
		event.preventDefault();
		toggleFullscreen();
		break;
		case "KeyL":
		event.preventDefault();
		ultraClean = !ultraClean;
		break;
		case "Equal":
		case "NumpadAdd":
		event.preventDefault();
		adjustSpeed(4);
		break;
		case "Minus":
		case "NumpadSubtract":
		event.preventDefault();
		adjustSpeed(-4);
		break;
		case "BracketLeft":
		event.preventDefault();
		fontSize = clamp(fontSize - 2, 22, 64);
		break;
		case "BracketRight":
		event.preventDefault();
		fontSize = clamp(fontSize + 2, 22, 64);
		break;
		}
	};

	// Reactive: persistir cuando cambian opciones
	$: if (
		isReady &&
		(text ||
		speed ||
		fontSize ||
		lineHeight ||
		isMirror ||
		autoCenter ||
		smooth ||
		glow ||
		focusMode ||
		dimOutside ||
		ultraClean ||
		countdownDuration)
	) {
		scheduleSave();
	}

	// Recalcular max scroll cuando cambian dimensiones del texto
	$: if (isReady && (fontSize || lineHeight)) {
		queueMicrotask(() => {
		recomputeMaxScroll();
		updateProgress();
		});
	}

	onMount(() => {
		isDark = document.documentElement.classList.contains("dark");
		darkModeObserver = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
		if (mutation.attributeName === "class") {
		isDark = document.documentElement.classList.contains("dark");
		}
		}
		});
		darkModeObserver.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class"],
		});

		window.addEventListener("keydown", onKey);

		const mql = window.matchMedia("(max-width: 768px)");
		isMobile = mql.matches;
		showMobileBanner = isMobile;
		const onMql = (e: MediaQueryListEvent) => {
		isMobile = e.matches;
		showMobileBanner = e.matches && showMobileBanner;
		};
		mql.addEventListener("change", onMql);

		applyStoredThemeToDocument();
		stopThemeWatch = watchSystemThemeChanges(getStoredTheme());

		loadState();
		loadScripts();

		try {
		const lastScriptId = localStorage.getItem(lastScriptKey);
		if (lastScriptId) loadScript(lastScriptId);
		} catch {}

		try {
		if (!localStorage.getItem(onboardingKey)) showOnboarding = true;
		} catch {}

		// ✅ FIX 5: wheel registrado como no-pasivo para que preventDefault funcione
		const wheelHandler = (e: Event) => handleWheel(e as WheelEvent);
		scrollContainer?.addEventListener("wheel", wheelHandler, { passive: false });

		const onFullscreenChange = () => {
		isFullscreen = Boolean(document.fullscreenElement);
		};
		document.addEventListener("fullscreenchange", onFullscreenChange);

		const onResize = () => {
		if (scrollContainer && content) {
		recomputeMaxScroll();
		// Si estamos reproduciendo, mantener posición relativa
		if (isPlaying) {
		const ratio =
		cachedMaxScroll > 0 ? scrollContainer.scrollTop / cachedMaxScroll : 0;
		// pequeño ajuste de ratio si max cambió
		updateProgress();
		}
		}
		};
		window.addEventListener("resize", onResize);
		window.addEventListener("orientationchange", () => setTimeout(onResize, 300));

		observer?.disconnect();
		observer = new IntersectionObserver(() => updateProgress());
		if (scrollContainer) observer.observe(scrollContainer);

		isReady = true;
		updateProgress();

		return () => {
		document.removeEventListener("fullscreenchange", onFullscreenChange);
		window.removeEventListener("resize", onResize);
		window.removeEventListener("orientationchange", onResize as unknown as EventListener);
		scrollContainer?.removeEventListener("wheel", wheelHandler);
		mql.removeEventListener("change", onMql);
		};
	});

	onDestroy(() => {
		window.removeEventListener("keydown", onKey);
		pause();
		observer?.disconnect();
		darkModeObserver?.disconnect();
		if (saveTimeout) clearTimeout(saveTimeout);
		if (countdownTimer) clearInterval(countdownTimer);
		stopThemeWatch?.();
		stopThemeWatch = null;
		if (raf) cancelAnimationFrame(raf);
	});
</script>

<div class="teleprompter-wrapper" class:clean={ultraClean} class:dark={isDark}>
	{#if showOnboarding}
	<div class="teleprompter-onboarding-overlay">
		<div class="teleprompter-onboarding-card premium">
		<div class="onboarding-header">
		<div class="logo-gradient">🎬</div>
		<h2>Teleprompter Premium</h2>
		<p class="subtitle">Tu estudio profesional de lectura en pantalla</p>
		</div>

		<div class="help-tabs">
		<button class="tab-btn" class:active={helpTab === 'quickstart'} on:click={() => helpTab = 'quickstart'}>Inicio rápido</button>
		<button class="tab-btn" class:active={helpTab === 'youtube'} on:click={() => helpTab = 'youtube'}>Ajustes YouTube</button>
		<button class="tab-btn" class:active={helpTab === 'shortcuts'} on:click={() => helpTab = 'shortcuts'}>Atajos</button>
		<button class="tab-btn" class:active={helpTab === 'tips'} on:click={() => helpTab = 'tips'}>Tips Pro</button>
		</div>

		<div class="tab-content">
		{#if helpTab === 'quickstart'}
		<div class="tab-panel">
		<div class="onboarding-step">
		<div class="step-icon">📝</div>
		<h3>1. Pega tu guion</h3>
		<p>Escribe o pega el texto en el área de texto</p>
		</div>
		<div class="onboarding-step">
		<div class="step-icon">⚙️</div>
		<h3>2. Ajusta a tu ritmo</h3>
		<p>Velocidad, tamaño y opciones según tu preferencia</p>
		</div>
		<div class="onboarding-step">
		<div class="step-icon">▶️</div>
		<h3>3. Empieza a grabar</h3>
		<p>Play o Espacio para iniciar</p>
		</div>
		</div>
		{:else if helpTab === 'youtube'}
		<div class="tab-panel youtube-settings">
		<h3>⚙️ Configuración recomendada para YouTube</h3>
		<p class="tab-desc">Ajustes para grabación profesional con lectura natural:</p>
		<div class="settings-list">
		<div class="setting-item"><span class="setting-label">🐢 Velocidad:</span><span class="setting-value">50–70 px/seg</span></div>
		<div class="setting-item"><span class="setting-label">📏 Fuente:</span><span class="setting-value">38–42px</span></div>
		<div class="setting-item"><span class="setting-label">📐 Interlineado:</span><span class="setting-value">1.7–1.8</span></div>
		<div class="setting-item"><span class="setting-label">🔄 Espejo:</span><span class="setting-value">Según cámara (frontal=on)</span></div>
		<div class="setting-item"><span class="setting-label">🎯 Focus:</span><span class="setting-value">Activado</span></div>
		<div class="setting-item"><span class="setting-label">⏱️ Countdown:</span><span class="setting-value">3 segundos</span></div>
		</div>
		<button class="btn-youtube-apply" on:click={() => { applyYouTubeSettings(); helpTab = 'quickstart'; }}>
		✨ Aplicar ajustes YouTube
		</button>
		</div>
		{:else if helpTab === 'shortcuts'}
		<div class="tab-panel shortcuts-panel">
		<h3>⌨️ Atajos de teclado</h3>
		<div class="shortcuts-table">
		<div class="shortcut-row"><span class="shortcut-key">Espacio / Enter</span><span class="shortcut-desc">Play / Pausa</span></div>
		<div class="shortcut-row"><span class="shortcut-key">R</span><span class="shortcut-desc">Reiniciar</span></div>
		<div class="shortcut-row"><span class="shortcut-key">↑ / ↓</span><span class="shortcut-desc">Velocidad ±10 (en reproducción)</span></div>
		<div class="shortcut-row"><span class="shortcut-key">Shift + ↑ / ↓</span><span class="shortcut-desc">Velocidad ±1 (preciso)</span></div>
		<div class="shortcut-row"><span class="shortcut-key">[ / ]</span><span class="shortcut-desc">Tamaño de fuente</span></div>
		<div class="shortcut-row"><span class="shortcut-key">M</span><span class="shortcut-desc">Modo espejo</span></div>
		<div class="shortcut-row"><span class="shortcut-key">F</span><span class="shortcut-desc">Focus mode</span></div>
		<div class="shortcut-row"><span class="shortcut-key">X</span><span class="shortcut-desc">Pantalla completa</span></div>
		<div class="shortcut-row"><span class="shortcut-key">L</span><span class="shortcut-desc">Modo limpio</span></div>
		<div class="shortcut-row"><span class="shortcut-key">+ / −</span><span class="shortcut-desc">Velocidad ±4</span></div>
		</div>
		</div>
		{:else if helpTab === 'tips'}
		<div class="tab-panel tips-panel">
		<h3>💡 Tips profesionales</h3>
		<div class="tips-list">
		<div class="tip-item-pro"><span class="tip-number">1</span><div class="tip-content"><strong>Practica 2-3 veces antes de grabar</strong><p>Familiarízate con el texto para lectura natural.</p></div></div>
		<div class="tip-item-pro"><span class="tip-number">2</span><div class="tip-content"><strong>Párrafos cortos de 2-3 líneas</strong><p>Facilita la lectura continua.</p></div></div>
		<div class="tip-item-pro"><span class="tip-number">3</span><div class="tip-content"><strong>Mira a la cámara</strong><p>Posiciona el teleprompter cerca y usa visión periférica.</p></div></div>
		<div class="tip-item-pro"><span class="tip-number">4</span><div class="tip-content"><strong>Encuentra tu ritmo</strong><p>Ni persigas ni esperes al texto.</p></div></div>
		<div class="tip-item-pro"><span class="tip-number">5</span><div class="tip-content"><strong>Focus Mode en sesiones largas</strong><p>Reduce la fatiga visual.</p></div></div>
		</div>
		</div>
		{/if}
		</div>

		<button class="btn-onboarding premium-btn" on:click={() => { showOnboarding = false; try { localStorage.setItem(onboardingKey, 'true'); } catch {} }}>
		Comenzar
		</button>
		</div>
	</div>
	{/if}

	<div class="teleprompter-header">
	<div>
		<h1 class="teleprompter-title">Teleprompter</h1>
		<p class="teleprompter-subtitle">Estudio profesional de lectura en pantalla</p>
		<div class="status-row">
		<div class="status-indicator" style={`background-color: ${getStatusColor()}`}></div>
		<p class="teleprompter-status">{getStatus()}</p>
		{#if wordCount > 0}
		<span class="word-count">· {wordCount} palabras · {readingTimeLabel}</span>
		{/if}
		</div>
	</div>
	<div class="teleprompter-header-actions">
		<button class="btn-help" on:click={() => (showOnboarding = true)} title="Ver tutorial">
		<span class="help-icon">?</span>
		<span class="help-badge">Ayuda</span>
		</button>
		<button class="btn-plain" class:active={!showControls} on:click={() => (showControls = !showControls)}>
		{showControls ? "Ocultar controles" : "Mostrar controles"}
		</button>
		<button class="btn-plain" on:click={toggleFullscreen}>
		{isFullscreen ? "Salir pantalla completa" : "Pantalla completa (X)"}
		</button>
		<button class="btn-plain" class:active={ultraClean} on:click={() => (ultraClean = !ultraClean)}>
		{ultraClean ? "Salir modo limpio" : "Modo limpio (L)"}
		</button>
	</div>
	</div>

	{#if showMobileBanner}
	<div class="mobile-tip-banner">
		<div class="mobile-tip-content">
		<span class="mobile-tip-icon">💡</span>
		<p>Mejor experiencia en pantalla grande. <strong>👆 Toca</strong> para pausar · <strong>👆👆</strong> pantalla completa</p>
		</div>
		<button class="mobile-tip-close" on:click={() => showMobileBanner = false} aria-label="Cerrar">✕</button>
	</div>
	{/if}

	<div class="teleprompter-panel">
	<div class="script-manager">
		<label for="script-selector" class="manager-label">Guion guardado:</label>
		<div class="script-controls">
		<select id="script-selector" bind:value={currentScript} on:change={(e) => { const id = (e.target as HTMLSelectElement).value; if (id) loadScript(id); else newScript(); }}>
		<option value="">-- Nuevo guion --</option>
		{#each scripts as script}
		<option value={script.id}>{script.name} · {formatDateTime(script.updatedAt)}</option>
		{/each}
		</select>
		<button class="btn-icon" on:click={saveCurrentScript} title="Guardar guion actual">💾</button>
		<button class="btn-icon" on:click={newScript} title="Nuevo guion">➕</button>
		{#if currentScript}
		<button class="btn-icon" on:click={() => deleteScript(currentScript!)} title="Eliminar guion">🗑️</button>
		{/if}
		</div>
	</div>

	<textarea class="teleprompter-input" bind:value={text} rows={6} placeholder="Escribe o pega aquí tu guion..."></textarea>

	{#if showControls}
	<div class="teleprompter-controls">
		<div class="controls-grid">
		<div class="control-group">
		<div class="control-label-row">
		<label>Velocidad</label>
		<span class="speed-label">{getSpeedLabel(speed)}</span>
		</div>
		<input type="range" class="custom-range" min={speedMin} max={speedMax} step="1" bind:value={speed} on:input={onSpeedInput} />
		<div class="control-value-row">
		<span class="control-value">{speed} px/seg</span>
		<div class="speed-indicator-bar" style={`width: ${((speed - speedMin) / (speedMax - speedMin)) * 100}%; background-color: ${getSpeedColor()}`}></div>
		</div>
		</div>

		<div class="control-group">
		<div class="control-label-row"><label>Tamaño</label></div>
		<input type="range" class="custom-range" min="22" max="64" step="1" bind:value={fontSize} />
		<div class="control-value-row"><span class="control-value">{fontSize}px</span></div>
		</div>

		<div class="control-group">
		<div class="control-label-row"><label>Interlineado</label></div>
		<input type="range" class="custom-range" min="1.2" max="2.2" step="0.05" bind:value={lineHeight} />
		<div class="control-value-row"><span class="control-value">{lineHeight.toFixed(2)}</span></div>
		</div>

		<div class="control-group">
		<div class="control-label-row"><label>Countdown</label></div>
		<select class="countdown-select" bind:value={countdownDuration}>
		<option value={0}>Sin countdown</option>
		<option value={1}>1 segundo</option>
		<option value={2}>2 segundos</option>
		<option value={3}>3 segundos</option>
		<option value={5}>5 segundos</option>
		</select>
		</div>
		</div>

		<div class="control-group toggles">
		<label>Opciones</label>
		<div class="toggle-grid">
		<button class="toggle-btn" class:active={isMirror} on:click={() => (isMirror = !isMirror)} title="Cámaras frontales que invierten la imagen">Espejo (M)</button>
		<button class="toggle-btn" class:active={autoCenter} on:click={() => (autoCenter = !autoCenter)} title="Mantiene el texto centrado">Auto-centrar</button>
		<button class="toggle-btn" class:active={smooth} on:click={() => (smooth = !smooth)} title="Transición suave entre velocidades">Suave</button>
		<button class="toggle-btn" class:active={glow} on:click={() => (glow = !glow)} title="Brillo de pantalla">Glow</button>
		<button class="toggle-btn" class:active={focusMode} on:click={() => (focusMode = !focusMode)} title="Resalta línea actual">Focus (F)</button>
		<button class="toggle-btn" class:active={dimOutside} on:click={() => (dimOutside = !dimOutside)} title="Oscurecer bordes">Oscurecer bordes</button>
		</div>
		</div>

		<div class="control-actions">
		<button class="btn-play" on:click={toggle}>
		{isPlaying ? "⏸ Pausar" : isCountingDown ? "⏹ Cancelar" : "▶ Reproducir"}
		</button>
		<button class="btn-action" on:click={reset}>Reiniciar (R)</button>
		<button class="btn-action" on:click={clearText}>Vaciar</button>
		<button class="btn-action" on:click={() => jump(-240)}>↑ Saltar arriba</button>
		<button class="btn-action" on:click={() => jump(240)}>↓ Saltar abajo</button>
		</div>
	</div>
	{/if}
	</div>

	<!-- ✅ FIX espejo: solo el contenido se invierte, no toda la pantalla -->
	<div class="teleprompter-screen" class:focus={focusMode} class:glow={glow} class:is-fullscreen={isFullscreen} bind:this={fullscreenTarget}>
	<div class="teleprompter-progress-top" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin="0" aria-valuemax="100" tabindex="0"
		on:click={(e) => {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const clickX = e.clientX - rect.left;
		scrollToProgress(clickX / rect.width);
		}}
		on:keydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault();
		scrollToProgress(0.5);
		}
		}}>
		<div class="progress-bar" style={`width: ${progress * 100}%`}></div>
		{#if isPlaying || progress > 0}
		<div class="time-remaining">{getEstimatedTimeRemaining()}</div>
		{/if}
	</div>

	<div class="reading-position-marker"></div>

	<div class="teleprompter-frame"
		bind:this={scrollContainer}
		on:click={handleFrameClick}
		on:touchstart={handleTouchStart}
		on:touchmove={handleTouchMove}
		style={`padding: ${autoCenter ? "35vh 2rem 50vh" : "2.5rem 2rem"};`}
		tabindex="-1">
		<!-- ✅ FIX espejo: este wrapper es el que se invierte -->
		<div class="teleprompter-mirror-wrap" class:mirror={isMirror}>
		<div class="teleprompter-content"
		style={`font-size:${fontSize}px; line-height:${lineHeight}; letter-spacing: 0.01em;`}
		bind:this={content}>
		{#each lines as line, index}
		<p class:active={index === activeLineIndex}
		class:dimmed={focusMode && dimOutside && index !== activeLineIndex}
		bind:this={lineElements[index]}>{line}</p>
		{/each}
		</div>
		</div>
	</div>

	<div class="teleprompter-float">
		<button class="btn-float" on:click={toggle} title={isPlaying ? "Pausar" : "Reproducir"} aria-label={isPlaying ? "Pausar" : "Reproducir"}>
		{isPlaying ? "⏸" : isCountingDown ? "⏹" : "▶"}
		</button>
		<button class="btn-float" on:click={() => jump(-120)} title="Saltar arriba" aria-label="Saltar arriba">↑</button>
		<button class="btn-float" on:click={() => jump(120)} title="Saltar abajo" aria-label="Saltar abajo">↓</button>
		{#if isFullscreen}
		<div class="float-speed-control">
		<input type="range" class="mini-range" min={speedMin} max={speedMax} step="1" bind:value={speed} on:input={onSpeedInput} aria-label="Velocidad" />
		<span class="mini-speed">{speed}</span>
		</div>
		{/if}
		<button class="btn-float" on:click={() => (isMirror = !isMirror)} title="Espejo" aria-label="Espejo"
		class:active={isMirror}>M</button>
		<button class="btn-float" on:click={toggleFullscreen} title="Pantalla completa" aria-label="Pantalla completa">⛶</button>
	</div>

	<div class="teleprompter-footer">
		<div class="shortcut">
		Espacio/Enter = Play · ↑/↓ = Velocidad · M = Espejo · F = Focus · L = Limpio · R = Reset · X = Fullscreen · +/− = Velocidad
		</div>
	</div>

	{#if isCountingDown}
	<div class="teleprompter-countdown"><span>{countdown}</span></div>
	{/if}
	</div>
</div>

<style>
	:root {
	--hue: 220;
	}

	.teleprompter-wrapper {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	position: relative;
	color: #0f172a;
	transition: color 0.3s ease;
	}

	:global(.dark) .teleprompter-wrapper,
	.teleprompter-wrapper.dark {
	color: #e2e8f0;
	}

	.teleprompter-wrapper.clean .teleprompter-header,
	.teleprompter-wrapper.clean .teleprompter-panel,
	.teleprompter-wrapper.clean .teleprompter-footer {
	display: none;
	}

	.teleprompter-wrapper.clean .teleprompter-screen {
	height: 70vh;
	}

	/* Onboarding */
	.teleprompter-onboarding-overlay {
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

	.teleprompter-onboarding-card {
	max-width: 800px;
	width: 100%;
	background: rgba(255, 255, 255, 0.98);
	border-radius: 1.5rem;
	padding: 2.5rem;
	box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4);
	border: 1px solid rgba(255, 255, 255, 0.2);
	display: grid;
	gap: 1.5rem;
	animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	max-height: 90vh;
	overflow-y: auto;
	}

	:global(.dark) .teleprompter-onboarding-card,
	.dark .teleprompter-onboarding-card {
	background: rgba(15, 23, 42, 0.98);
	border-color: rgba(148, 163, 184, 0.2);
	}

	.onboarding-header { text-align: center; margin-bottom: 0.5rem; }

	.logo-gradient {
	font-size: 4rem;
	margin-bottom: 0.5rem;
	animation: scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.onboarding-header h2 {
	font-size: 2rem;
	font-weight: 800;
	background: linear-gradient(135deg, oklch(0.70 0.18 var(--hue)), oklch(0.65 0.20 calc(var(--hue) + 30)));
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	background-clip: text;
	margin-bottom: 0.5rem;
	}

	.onboarding-header .subtitle {
	font-size: 1.05rem;
	color: #64748b;
	font-weight: 500;
	}

	:global(.dark) .onboarding-header .subtitle,
	.dark .onboarding-header .subtitle { color: #94a3b8; }

	.help-tabs {
	display: flex;
	gap: 0.5rem;
	border-bottom: 2px solid oklch(0.90 0.02 var(--hue));
	margin-bottom: 1rem;
	overflow-x: auto;
	}

	:global(.dark) .help-tabs,
	.dark .help-tabs { border-bottom-color: oklch(0.30 0.02 var(--hue)); }

	.tab-btn {
	background: transparent;
	border: none;
	padding: 0.75rem 1.25rem;
	font-size: 0.95rem;
	font-weight: 600;
	color: #64748b;
	cursor: pointer;
	transition: all 0.2s ease;
	border-bottom: 3px solid transparent;
	white-space: nowrap;
	}

	.tab-btn:hover { color: oklch(0.60 0.18 var(--hue)); }
	.tab-btn.active {
	color: oklch(0.60 0.18 var(--hue));
	border-bottom-color: oklch(0.60 0.18 var(--hue));
	}

	:global(.dark) .tab-btn, .dark .tab-btn { color: #94a3b8; }
	:global(.dark) .tab-btn:hover, .dark .tab-btn:hover,
	:global(.dark) .tab-btn.active, .dark .tab-btn.active {
	color: oklch(0.72 0.18 var(--hue));
	border-bottom-color: oklch(0.72 0.18 var(--hue));
	}

	.tab-content { min-height: 280px; animation: fadeIn 0.3s ease; }
	.tab-panel { animation: fadeInUp 0.3s ease; }
	.tab-desc { color: #64748b; margin-bottom: 1.5rem; line-height: 1.6; }
	:global(.dark) .tab-desc, .dark .tab-desc { color: #94a3b8; }

	.onboarding-step {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 0.5rem;
	opacity: 0;
	animation: fadeInUp 0.5s ease forwards;
	margin-bottom: 1rem;
	}

	.onboarding-step:nth-child(1) { animation-delay: 0.1s; }
	.onboarding-step:nth-child(2) { animation-delay: 0.2s; }
	.onboarding-step:nth-child(3) { animation-delay: 0.3s; }

	.step-icon { font-size: 2.5rem; margin-bottom: 0.25rem; }
	.onboarding-step h3 { font-size: 1.2rem; font-weight: 700; color: #0f172a; }
	:global(.dark) .onboarding-step h3, .dark .onboarding-step h3 { color: #e2e8f0; }
	.onboarding-step p { color: #475569; line-height: 1.5; }
	:global(.dark) .onboarding-step p, .dark .onboarding-step p { color: #94a3b8; }

	.btn-onboarding {
	background: linear-gradient(135deg, oklch(0.70 0.18 var(--hue)), oklch(0.65 0.20 calc(var(--hue) + 30)));
	color: white;
	border: none;
	border-radius: 0.75rem;
	padding: 0.85rem 2rem;
	font-weight: 700;
	font-size: 1.05rem;
	cursor: pointer;
	transition: transform 0.2s ease, box-shadow 0.3s ease;
	box-shadow: 0 8px 20px oklch(0.70 0.18 var(--hue) / 0.35);
	}

	.btn-onboarding:hover {
	transform: translateY(-2px) scale(1.02);
	box-shadow: 0 12px 28px oklch(0.70 0.18 var(--hue) / 0.45);
	}
	.btn-onboarding:active { transform: translateY(0) scale(0.98); }

	.youtube-settings h3 {
	font-size: 1.4rem;
	font-weight: 700;
	color: #0f172a;
	margin-bottom: 1rem;
	}
	:global(.dark) .youtube-settings h3, .dark .youtube-settings h3 { color: #e2e8f0; }

	.settings-list { display: grid; gap: 0.75rem; margin-bottom: 1.5rem; }

	.setting-item {
	display: flex;
	gap: 0.75rem;
	padding: 0.75rem;
	background: oklch(0.97 0.01 var(--hue));
	border-radius: 0.5rem;
	border-left: 3px solid oklch(0.70 0.18 var(--hue));
	flex-wrap: wrap;
	}
	:global(.dark) .setting-item, .dark .setting-item { background: oklch(0.20 0.02 var(--hue)); }
	.setting-label { font-weight: 700; color: #0f172a; min-width: 130px; }
	:global(.dark) .setting-label, .dark .setting-label { color: #e2e8f0; }
	.setting-value { color: #475569; line-height: 1.5; }
	:global(.dark) .setting-value, .dark .setting-value { color: #94a3b8; }

	.btn-youtube-apply {
	width: 100%;
	background: linear-gradient(135deg, #FF0000, #CC0000);
	color: white;
	border: none;
	border-radius: 0.75rem;
	padding: 1rem 2rem;
	font-weight: 700;
	font-size: 1.05rem;
	cursor: pointer;
	transition: transform 0.2s ease, box-shadow 0.3s ease;
	box-shadow: 0 8px 20px rgba(255, 0, 0, 0.3);
	}
	.btn-youtube-apply:hover {
	transform: translateY(-2px) scale(1.02);
	box-shadow: 0 12px 28px rgba(255, 0, 0, 0.4);
	}

	.shortcuts-panel h3 { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin-bottom: 1.25rem; }
	:global(.dark) .shortcuts-panel h3, .dark .shortcuts-panel h3 { color: #e2e8f0; }

	.shortcuts-table { display: grid; gap: 0.5rem; }

	.shortcut-row {
	display: grid;
	grid-template-columns: 200px 1fr;
	gap: 1rem;
	padding: 0.75rem;
	background: oklch(0.97 0.01 var(--hue));
	border-radius: 0.5rem;
	align-items: center;
	}
	:global(.dark) .shortcut-row, .dark .shortcut-row { background: oklch(0.20 0.02 var(--hue)); }

	.shortcut-key {
	font-family: 'Monaco', 'Courier New', monospace;
	font-weight: 700;
	color: oklch(0.60 0.18 var(--hue));
	background: oklch(0.94 0.01 var(--hue));
	padding: 0.35rem 0.75rem;
	border-radius: 0.375rem;
	font-size: 0.9rem;
	text-align: center;
	}
	:global(.dark) .shortcut-key, .dark .shortcut-key {
	background: oklch(0.25 0.02 var(--hue));
	color: oklch(0.72 0.18 var(--hue));
	}
	.shortcut-desc { color: #475569; font-size: 0.95rem; }
	:global(.dark) .shortcut-desc, .dark .shortcut-desc { color: #94a3b8; }

	.tips-panel h3 { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin-bottom: 1.25rem; }
	:global(.dark) .tips-panel h3, .dark .tips-panel h3 { color: #e2e8f0; }
	.tips-list { display: grid; gap: 1rem; }

	.tip-item-pro {
	display: flex;
	gap: 1rem;
	padding: 1rem;
	background: oklch(0.97 0.01 var(--hue));
	border-radius: 0.75rem;
	border-left: 4px solid oklch(0.70 0.18 var(--hue));
	}
	:global(.dark) .tip-item-pro, .dark .tip-item-pro { background: oklch(0.20 0.02 var(--hue)); }

	.tip-number {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 2rem;
	height: 2rem;
	background: oklch(0.70 0.18 var(--hue));
	color: white;
	border-radius: 50%;
	font-weight: 800;
	flex-shrink: 0;
	}

	.tip-content strong {
	display: block;
	color: #0f172a;
	margin-bottom: 0.35rem;
	font-weight: 700;
	}
	:global(.dark) .tip-content strong, .dark .tip-content strong { color: #e2e8f0; }
	.tip-content p { color: #64748b; line-height: 1.5; font-size: 0.95rem; margin: 0; }
	:global(.dark) .tip-content p, .dark .tip-content p { color: #94a3b8; }

	.premium-btn { margin-top: 0.5rem; }

	/* Header */
	.teleprompter-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	flex-wrap: wrap;
	}

	.teleprompter-title {
	font-size: 2rem;
	font-weight: 800;
	background: linear-gradient(135deg, oklch(0.70 0.18 var(--hue)), oklch(0.65 0.20 calc(var(--hue) + 30)));
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	background-clip: text;
	margin-bottom: 0.25rem;
	}

	.teleprompter-subtitle {
	color: #475569;
	font-size: 1rem;
	line-height: 1.4;
	}
	:global(.dark) .teleprompter-subtitle, .dark .teleprompter-subtitle { color: #94a3b8; }

	.status-row { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap; }

	.status-indicator {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	transition: background-color 0.3s ease;
	animation: pulse 2s ease-in-out infinite;
	}

	.teleprompter-status {
	color: #64748b;
	font-size: 0.9rem;
	font-weight: 600;
	}
	:global(.dark) .teleprompter-status, .dark .teleprompter-status { color: #94a3b8; }

	.teleprompter-header-actions {
	display: flex;
	gap: 0.75rem;
	flex-wrap: wrap;
	align-items: center;
	}

	.btn-help {
	position: relative;
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 1rem;
	background: oklch(0.95 0.02 var(--hue));
	color: oklch(0.50 0.14 var(--hue));
	border: 1px solid oklch(0.85 0.05 var(--hue));
	border-radius: 999px;
	font-weight: 600;
	font-size: 0.9rem;
	cursor: pointer;
	transition: all 0.2s ease;
	}

	:global(.dark) .btn-help, .dark .btn-help {
	background: oklch(0.30 0.03 var(--hue));
	color: oklch(0.75 0.18 var(--hue));
	border-color: oklch(0.40 0.05 var(--hue));
	}

	.btn-help:hover {
	transform: translateY(-1px);
	box-shadow: 0 4px 12px oklch(0.70 0.18 var(--hue) / 0.2);
	}

	.help-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: oklch(0.70 0.18 var(--hue));
	color: white;
	font-weight: 700;
	font-size: 0.85rem;
	}

	.btn-plain {
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
	:global(.dark) .btn-plain, .dark .btn-plain { color: #cbd5e1; border-color: #475569; }

	.btn-plain:hover {
	background: oklch(0.95 0.02 var(--hue));
	border-color: oklch(0.80 0.06 var(--hue));
	color: oklch(0.50 0.14 var(--hue));
	}
	:global(.dark) .btn-plain:hover, .dark .btn-plain:hover {
	background: oklch(0.25 0.03 var(--hue));
	border-color: oklch(0.45 0.08 var(--hue));
	color: oklch(0.75 0.18 var(--hue));
	}
	.btn-plain.active {
	background: oklch(0.92 0.04 var(--hue));
	border-color: oklch(0.75 0.10 var(--hue));
	color: oklch(0.55 0.18 var(--hue));
	}
	:global(.dark) .btn-plain.active, .dark .btn-plain.active {
	background: oklch(0.28 0.04 var(--hue));
	border-color: oklch(0.50 0.10 var(--hue));
	color: oklch(0.75 0.18 var(--hue));
	}

	/* Panel */
	.teleprompter-panel {
	background: rgba(255, 255, 255, 0.85);
	backdrop-filter: blur(10px);
	border-radius: 1.25rem;
	padding: 1.5rem;
	border: 1px solid rgba(0, 0, 0, 0.08);
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
	transition: all 0.3s ease;
	}
	:global(.dark) .teleprompter-panel, .dark .teleprompter-panel {
	background: rgba(30, 41, 59, 0.85);
	border-color: rgba(148, 163, 184, 0.15);
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
	}

	.script-manager { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
	.manager-label { font-weight: 600; font-size: 0.9rem; color: #334155; }
	:global(.dark) .manager-label, .dark .manager-label { color: #cbd5e1; }

	.script-controls { display: flex; gap: 0.5rem; flex-wrap: wrap; }

	.script-controls select {
	flex: 1;
	min-width: 200px;
	padding: 0.6rem 1rem;
	background: white;
	color: #0f172a;
	border: 1px solid #cbd5e1;
	border-radius: 0.5rem;
	font-size: 0.9rem;
	cursor: pointer;
	transition: all 0.2s ease;
	}
	:global(.dark) .script-controls select, .dark .script-controls select {
	background: #1e293b;
	color: #e2e8f0;
	border-color: #475569;
	}
	.script-controls select:hover { border-color: oklch(0.70 0.18 var(--hue)); }
	.script-controls select:focus {
	outline: none;
	border-color: oklch(0.70 0.18 var(--hue));
	box-shadow: 0 0 0 3px oklch(0.70 0.18 var(--hue) / 0.1);
	}

	.btn-icon {
	padding: 0.6rem 0.9rem;
	background: oklch(0.95 0.02 var(--hue));
	border: 1px solid #cbd5e1;
	border-radius: 0.5rem;
	font-size: 1.1rem;
	cursor: pointer;
	transition: all 0.2s ease;
	}
	:global(.dark) .btn-icon, .dark .btn-icon {
	background: oklch(0.25 0.03 var(--hue));
	border-color: #475569;
	}
	.btn-icon:hover {
	transform: translateY(-1px);
	background: oklch(0.70 0.18 var(--hue));
	border-color: oklch(0.70 0.18 var(--hue));
	box-shadow: 0 4px 12px oklch(0.70 0.18 var(--hue) / 0.2);
	}

	.teleprompter-input {
	width: 100%;
	min-height: 120px;
	padding: 1rem;
	background: white;
	color: #0f172a;
	border: 1px solid #cbd5e1;
	border-radius: 0.75rem;
	font-family: inherit;
	font-size: 1rem;
	line-height: 1.5;
	resize: vertical;
	transition: all 0.2s ease;
	margin-bottom: 1rem;
	}
	:global(.dark) .teleprompter-input, .dark .teleprompter-input {
	background: #1e293b;
	color: #e2e8f0;
	border-color: #475569;
	}
	.teleprompter-input::placeholder { color: #94a3b8; }
	:global(.dark) .teleprompter-input::placeholder, .dark .teleprompter-input::placeholder { color: #64748b; }
	.teleprompter-input:focus {
	outline: none;
	border-color: oklch(0.70 0.18 var(--hue));
	box-shadow: 0 0 0 3px oklch(0.70 0.18 var(--hue) / 0.1);
	}

	.teleprompter-controls { display: flex; flex-direction: column; gap: 1.5rem; }

	.controls-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	gap: 1.25rem;
	}
	@media (min-width: 768px) { .controls-grid { grid-template-columns: repeat(2, 1fr); } }

	.control-group {
	background: rgba(255, 255, 255, 0.5);
	border: 1px solid rgba(0, 0, 0, 0.06);
	border-radius: 0.75rem;
	padding: 1rem;
	transition: all 0.2s ease;
	}
	:global(.dark) .control-group, .dark .control-group {
	background: rgba(15, 23, 42, 0.4);
	border-color: rgba(148, 163, 184, 0.1);
	}
	.control-group:hover {
	background: rgba(255, 255, 255, 0.8);
	border-color: oklch(0.85 0.06 var(--hue));
	}
	:global(.dark) .control-group:hover, .dark .control-group:hover {
	background: rgba(15, 23, 42, 0.6);
	border-color: oklch(0.45 0.08 var(--hue));
	}

	.control-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
	.control-group label { font-weight: 600; font-size: 0.9rem; color: #334155; }
	:global(.dark) .control-group label, .dark .control-group label { color: #cbd5e1; }

	.speed-label {
	font-size: 0.85rem;
	font-weight: 500;
	color: oklch(0.60 0.16 var(--hue));
	padding: 0.15rem 0.6rem;
	background: oklch(0.95 0.03 var(--hue));
	border-radius: 999px;
	}
	:global(.dark) .speed-label, .dark .speed-label {
	color: oklch(0.75 0.18 var(--hue));
	background: oklch(0.25 0.04 var(--hue));
	}

	.control-value-row { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; }
	.control-value { font-size: 0.9rem; font-weight: 600; color: #475569; }
	:global(.dark) .control-value, .dark .control-value { color: #94a3b8; }

	.speed-indicator-bar {
	height: 4px;
	border-radius: 999px;
	transition: all 0.3s ease;
	max-width: 80px;
	}

	.custom-range {
	width: 100%;
	height: 6px;
	-webkit-appearance: none;
	appearance: none;
	background: linear-gradient(to right, #cbd5e1 0%, #cbd5e1 100%);
	border-radius: 999px;
	outline: none;
	cursor: pointer;
	transition: all 0.2s ease;
	}
	:global(.dark) .custom-range, .dark .custom-range {
	background: linear-gradient(to right, #475569 0%, #475569 100%);
	}
	.custom-range::-webkit-slider-thumb {
	-webkit-appearance: none;
	appearance: none;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: oklch(0.70 0.18 var(--hue));
	cursor: pointer;
	border: 3px solid white;
	box-shadow: 0 2px 8px oklch(0.70 0.18 var(--hue) / 0.3);
	transition: all 0.15s ease;
	}
	:global(.dark) .custom-range::-webkit-slider-thumb, .dark .custom-range::-webkit-slider-thumb { border-color: #1e293b; }
	.custom-range::-webkit-slider-thumb:hover {
	transform: scale(1.15);
	box-shadow: 0 4px 12px oklch(0.70 0.18 var(--hue) / 0.4);
	}
	.custom-range::-moz-range-thumb {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: oklch(0.70 0.18 var(--hue));
	cursor: pointer;
	border: 3px solid white;
	box-shadow: 0 2px 8px oklch(0.70 0.18 var(--hue) / 0.3);
	}
	:global(.dark) .custom-range::-moz-range-thumb, .dark .custom-range::-moz-range-thumb { border-color: #1e293b; }

	.countdown-select {
	width: 100%;
	padding: 0.6rem 1rem;
	background: white;
	color: #0f172a;
	border: 1px solid #cbd5e1;
	border-radius: 0.5rem;
	font-size: 0.9rem;
	cursor: pointer;
	transition: all 0.2s ease;
	}
	:global(.dark) .countdown-select, .dark .countdown-select {
	background: #1e293b;
	color: #e2e8f0;
	border-color: #475569;
	}
	.countdown-select:hover { border-color: oklch(0.70 0.18 var(--hue)); }
	.countdown-select:focus {
	outline: none;
	border-color: oklch(0.70 0.18 var(--hue));
	box-shadow: 0 0 0 3px oklch(0.70 0.18 var(--hue) / 0.1);
	}

	.control-group.toggles { grid-column: 1 / -1; }

	.toggle-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
	gap: 0.75rem;
	}

	.toggle-btn {
	padding: 0.65rem 1rem;
	background: white;
	color: #475569;
	border: 1px solid #cbd5e1;
	border-radius: 999px;
	font-size: 0.9rem;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;
	text-align: center;
	}
	:global(.dark) .toggle-btn, .dark .toggle-btn {
	background: #1e293b;
	color: #cbd5e1;
	border-color: #475569;
	}
	.toggle-btn:hover {
	transform: translateY(-1px);
	border-color: oklch(0.70 0.18 var(--hue));
	box-shadow: 0 4px 12px oklch(0.70 0.18 var(--hue) / 0.15);
	}
	.toggle-btn.active {
	background: oklch(0.70 0.18 var(--hue));
	color: white;
	border-color: oklch(0.70 0.18 var(--hue));
	box-shadow: 0 4px 12px oklch(0.70 0.18 var(--hue) / 0.3);
	}

	.control-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }

	.btn-play {
	flex: 1;
	min-width: 180px;
	padding: 1rem 1.5rem;
	background: linear-gradient(135deg, oklch(0.70 0.18 var(--hue)), oklch(0.65 0.20 calc(var(--hue) + 30)));
	color: white;
	border: none;
	border-radius: 0.75rem;
	font-size: 1.05rem;
	font-weight: 700;
	cursor: pointer;
	transition: all 0.2s ease;
	box-shadow: 0 4px 16px oklch(0.70 0.18 var(--hue) / 0.3);
	}
	.btn-play:hover {
	transform: translateY(-2px);
	box-shadow: 0 6px 20px oklch(0.70 0.18 var(--hue) / 0.4);
	}
	.btn-play:active { transform: translateY(0); }

	.btn-action {
	padding: 0.75rem 1.25rem;
	background: white;
	color: #475569;
	border: 1px solid #cbd5e1;
	border-radius: 0.5rem;
	font-size: 0.9rem;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;
	}
	:global(.dark) .btn-action, .dark .btn-action {
	background: #1e293b;
	color: #cbd5e1;
	border-color: #475569;
	}
	.btn-action:hover {
	background: oklch(0.95 0.02 var(--hue));
	border-color: oklch(0.80 0.06 var(--hue));
	color: oklch(0.50 0.14 var(--hue));
	transform: translateY(-1px);
	}
	:global(.dark) .btn-action:hover, .dark .btn-action:hover {
	background: oklch(0.25 0.03 var(--hue));
	border-color: oklch(0.45 0.08 var(--hue));
	color: oklch(0.75 0.18 var(--hue));
	}

	/* Screen */
	.teleprompter-screen {
	position: relative;
	background: linear-gradient(135deg, #f8fafc, #f1f5f9);
	border-radius: 1.25rem;
	overflow: hidden;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
	height: 65vh;
	min-height: 500px;
	transition: all 0.3s ease;
	}
	:global(.dark) .teleprompter-screen, .dark .teleprompter-screen {
	background: linear-gradient(135deg, #0f172a, #1e293b);
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(148, 163, 184, 0.1);
	}
	@media (max-width: 768px) {
	.teleprompter-screen { min-height: 350px; height: 60vh; }
	}

	.teleprompter-screen.glow::before {
	content: "";
	position: absolute;
	inset: -2px;
	background: linear-gradient(135deg, oklch(0.75 0.18 var(--hue)), oklch(0.70 0.20 calc(var(--hue) + 60)));
	border-radius: inherit;
	opacity: 0.3;
	z-index: -1;
	filter: blur(20px);
	animation: glowPulse 3s ease-in-out infinite;
	}

	.teleprompter-screen.is-fullscreen {
	border-radius: 0;
	height: 100vh;
	min-height: unset;
	}

	.teleprompter-progress-top {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 4px;
	background: rgba(0, 0, 0, 0.1);
	z-index: 10;
	cursor: pointer;
	}
	:global(.dark) .teleprompter-progress-top, .dark .teleprompter-progress-top { background: rgba(255, 255, 255, 0.1); }

	.progress-bar {
	height: 100%;
	background: linear-gradient(90deg, oklch(0.70 0.18 var(--hue)), oklch(0.65 0.20 calc(var(--hue) + 60)));
	transition: width 0.15s linear;
	box-shadow: 0 0 10px oklch(0.70 0.18 var(--hue) / 0.5);
	}

	.time-remaining {
	position: absolute;
	top: 0.75rem;
	right: 1rem;
	padding: 0.35rem 0.75rem;
	background: rgba(0, 0, 0, 0.6);
	color: white;
	font-size: 0.85rem;
	font-weight: 600;
	border-radius: 999px;
	backdrop-filter: blur(8px);
	z-index: 11;
	font-variant-numeric: tabular-nums;
	}

	.reading-position-marker {
	position: absolute;
	top: 50%;
	left: 0;
	right: 0;
	height: 2px;
	background: oklch(0.70 0.18 var(--hue) / 0.25);
	z-index: 5;
	pointer-events: none;
	box-shadow: 0 0 20px oklch(0.70 0.18 var(--hue) / 0.3);
	}

	.teleprompter-screen.focus .reading-position-marker {
	background: oklch(0.70 0.18 var(--hue) / 0.45);
	box-shadow: 0 0 30px oklch(0.70 0.18 var(--hue) / 0.55);
	}

	.teleprompter-frame {
	height: 100%;
	overflow-y: auto;
	overflow-x: hidden;
	scroll-behavior: auto;
	scrollbar-width: thin;
	scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
	will-change: scroll-position;
	}

	:global(.dark) .teleprompter-frame, .dark .teleprompter-frame {
	scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
	}

	.teleprompter-frame::-webkit-scrollbar { width: 8px; }
	.teleprompter-frame::-webkit-scrollbar-track { background: transparent; }
	.teleprompter-frame::-webkit-scrollbar-thumb {
	background: rgba(0, 0, 0, 0.3);
	border-radius: 999px;
	}
	:global(.dark) .teleprompter-frame::-webkit-scrollbar-thumb, .dark .teleprompter-frame::-webkit-scrollbar-thumb {
	background: rgba(255, 255, 255, 0.3);
	}
	.teleprompter-frame::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.5); }

	/* ✅ FIX espejo: solo este contenedor se invierte */
	.teleprompter-mirror-wrap {
	display: block;
	transition: transform 0.3s ease;
	}
	.teleprompter-mirror-wrap.mirror {
	transform: scaleX(-1);
	}

	.teleprompter-content {
	color: #0f172a;
	text-align: center;
	user-select: none;
	transition: all 0.3s ease;
	}
	:global(.dark) .teleprompter-content, .dark .teleprompter-content { color: #f1f5f9; }

	.teleprompter-content p {
	margin: 0.75rem 0;
	padding: 0.5rem 1rem;
	transition: opacity 0.25s ease, background 0.2s ease;
	border-radius: 0.5rem;
	line-height: inherit;
	}

	.teleprompter-content p.active {
	background: rgba(0, 0, 0, 0.04);
	border-left: 4px solid oklch(0.70 0.18 var(--hue));
	padding-left: calc(1rem - 4px);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}
	:global(.dark) .teleprompter-content p.active, .dark .teleprompter-content p.active {
	background: rgba(255, 255, 255, 0.06);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.teleprompter-screen.focus .teleprompter-content p.dimmed {
	opacity: 0.25;
	}

	/* Float controls */
	.teleprompter-float {
	position: absolute;
	bottom: 1.5rem;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	gap: 0.5rem;
	align-items: center;
	padding: 0.75rem;
	background: rgba(0, 0, 0, 0.7);
	backdrop-filter: blur(12px);
	border-radius: 999px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
	z-index: 20;
	transition: opacity 0.3s ease, box-shadow 0.3s ease;
	opacity: 0.75;
	}
	.teleprompter-float:hover {
	opacity: 1;
	box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
	}

	.btn-float {
	width: 42px;
	height: 42px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(255, 255, 255, 0.15);
	color: white;
	border: 1px solid rgba(255, 255, 255, 0.2);
	border-radius: 50%;
	font-size: 1.05rem;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;
	}
	.btn-float:hover {
	background: oklch(0.70 0.18 var(--hue));
	border-color: oklch(0.70 0.18 var(--hue));
	transform: translateY(-2px) scale(1.05);
	box-shadow: 0 4px 12px oklch(0.70 0.18 var(--hue) / 0.4);
	}
	.btn-float.active {
	background: oklch(0.70 0.18 var(--hue));
	border-color: oklch(0.70 0.18 var(--hue));
	}

	.float-speed-control {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0 0.5rem;
	}

	.mini-range {
	width: 100px;
	height: 4px;
	-webkit-appearance: none;
	appearance: none;
	background: rgba(255, 255, 255, 0.3);
	border-radius: 999px;
	outline: none;
	cursor: pointer;
	}
	.mini-range::-webkit-slider-thumb {
	-webkit-appearance: none;
	appearance: none;
	width: 14px;
	height: 14px;
	border-radius: 50%;
	background: white;
	cursor: pointer;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}
	.mini-range::-moz-range-thumb {
	width: 14px;
	height: 14px;
	border-radius: 50%;
	background: white;
	cursor: pointer;
	border: none;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}
	.mini-speed {
	color: white;
	font-size: 0.85rem;
	font-weight: 600;
	min-width: 35px;
	font-variant-numeric: tabular-nums;
	}

	.teleprompter-footer {
	position: absolute;
	bottom: 1rem;
	left: 1rem;
	right: 1rem;
	text-align: center;
	z-index: 1;
	opacity: 0.5;
	transition: opacity 0.3s ease;
	pointer-events: none;
	}

	.shortcut {
	font-size: 0.8rem;
	color: #64748b;
	font-weight: 500;
	}
	:global(.dark) .shortcut, .dark .shortcut { color: #94a3b8; }

	.teleprompter-screen.is-fullscreen .teleprompter-footer { bottom: 5.5rem; }

	.teleprompter-countdown {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.85);
	backdrop-filter: blur(8px);
	z-index: 30;
	animation: fadeIn 0.3s ease;
	}
	.teleprompter-countdown span {
	font-size: 8rem;
	font-weight: 900;
	color: white;
	text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
	animation: countdownPulse 1s ease-in-out infinite;
	font-variant-numeric: tabular-nums;
	}

	.word-count {
	margin-left: 0.5rem;
	font-size: 0.85rem;
	color: oklch(0.55 0.02 var(--hue));
	}
	:global(.dark) .word-count, .dark .word-count { color: oklch(0.70 0.02 var(--hue)); }

	.mobile-tip-banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	padding: 0.65rem 1rem;
	background: oklch(0.94 0.03 var(--hue));
	border: 1px solid oklch(0.88 0.05 var(--hue));
	border-radius: 0.75rem;
	font-size: 0.82rem;
	line-height: 1.4;
	color: oklch(0.40 0.08 var(--hue));
	animation: fadeIn 0.4s ease;
	}
	:global(.dark) .mobile-tip-banner, .dark .mobile-tip-banner {
	background: oklch(0.22 0.03 var(--hue));
	border-color: oklch(0.32 0.05 var(--hue));
	color: oklch(0.78 0.06 var(--hue));
	}

	.mobile-tip-content {
	display: flex;
	align-items: flex-start;
	gap: 0.5rem;
	flex: 1;
	min-width: 0;
	}
	.mobile-tip-icon { font-size: 1.1rem; flex-shrink: 0; line-height: 1.3; }
	.mobile-tip-content p { margin: 0; color: inherit; font-size: inherit; line-height: inherit; }
	.mobile-tip-content p strong { color: oklch(0.50 0.12 var(--hue)); font-weight: 600; }
	:global(.dark) .mobile-tip-content p strong, .dark .mobile-tip-content p strong { color: oklch(0.72 0.12 var(--hue)); }

	.mobile-tip-close {
	background: none;
	border: none;
	color: oklch(0.55 0.05 var(--hue));
	font-size: 1rem;
	cursor: pointer;
	padding: 0.25rem;
	border-radius: 0.375rem;
	line-height: 1;
	flex-shrink: 0;
	transition: all 0.2s ease;
	}
	.mobile-tip-close:hover {
	background: oklch(0.88 0.04 var(--hue));
	color: oklch(0.40 0.08 var(--hue));
	}

	@media (min-width: 769px) { .mobile-tip-banner { display: none; } }

	@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
	@keyframes scaleIn {
	from { opacity: 0; transform: scale(0.9); }
	to { opacity: 1; transform: scale(1); }
	}
	@keyframes fadeInUp {
	from { opacity: 0; transform: translateY(20px); }
	to { opacity: 1; transform: translateY(0); }
	}
	@keyframes pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.6; }
	}
	@keyframes glowPulse {
	0%, 100% { opacity: 0.3; }
	50% { opacity: 0.5; }
	}
	@keyframes countdownPulse {
	0%, 100% { transform: scale(1); }
	50% { transform: scale(1.1); }
	}

	@media (max-width: 768px) {
	.teleprompter-header { flex-direction: column; align-items: flex-start; }
	.controls-grid { grid-template-columns: 1fr; }
	.toggle-grid { grid-template-columns: repeat(2, 1fr); }
	.control-actions { flex-direction: column; }
	.btn-play, .btn-action { width: 100%; }
	.teleprompter-float { bottom: 1rem; padding: 0.5rem; gap: 0.35rem; }
	.btn-float { width: 44px; height: 44px; font-size: 1.1rem; }
	.teleprompter-countdown span { font-size: 5rem; }
	}

	@media (orientation: landscape) and (max-height: 500px) {
	.teleprompter-screen { height: 85vh; min-height: unset; }
	.teleprompter-header { flex-direction: row; gap: 0.5rem; }
	.teleprompter-panel { padding: 0.75rem; }
	.teleprompter-float { bottom: 0.5rem; padding: 0.4rem; }
	.btn-float { width: 36px; height: 36px; font-size: 0.9rem; }
	.teleprompter-footer { display: none; }
	}
</style>
