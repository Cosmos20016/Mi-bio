<script lang="ts">
	import { onDestroy, onMount } from "svelte";

	// ============================================
	// Constantes de configuración
	// ============================================
	const STORAGE_KEY = "teleprompter:state:v4";
	const SCRIPTS_KEY = "teleprompter:scripts:v1";
	const LAST_SCRIPT_KEY = "teleprompter:lastScript:v1";
	const ONBOARDING_KEY = "teleprompter:onboarding:done:v1";

	const SPEED_MIN = 10;
	const SPEED_MAX = 400;
	const SPEED_DEFAULT = 60;
	const FONT_SIZE_MIN = 22;
	const FONT_SIZE_MAX = 64;
	const FONT_SIZE_DEFAULT = 34;
	const LINE_HEIGHT_MIN = 1.2;
	const LINE_HEIGHT_MAX = 2.2;
	const LINE_HEIGHT_DEFAULT = 1.6;
	const MAX_SCRIPTS = 20;

	const TAP_THRESHOLD = 280;
	const SWIPE_THRESHOLD = 30;
	const DOUBLE_TAP_WINDOW = 320;

	// ============================================
	// Types
	// ============================================
	interface SavedScript {
		id: string;
		name: string;
		text: string;
		createdAt: string;
		updatedAt: string;
	}

	type HelpTab = "quickstart" | "youtube" | "shortcuts" | "tips";
	type StatusKind = "idle" | "counting" | "playing" | "paused" | "ended";

	// ============================================
	// Utilidades puras
	// ============================================
	const clamp = (value: number, min: number, max: number): number =>
		Math.min(Math.max(value, min), max);

	const formatTime = (seconds: number): string => {
		if (seconds < 60) return `${seconds}s`;
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, "0")}`;
	};

	const formatDateTime = (iso: string): string => {
		const d = new Date(iso);
		return d.toLocaleDateString("es-ES", {
			day: "numeric",
			month: "short",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatRelative = (iso: string): string => {
		const diff = Date.now() - new Date(iso).getTime();
		const m = Math.floor(diff / 60000);
		const h = Math.floor(diff / 3600000);
		const d = Math.floor(diff / 86400000);
		if (m < 1) return "Ahora";
		if (m < 60) return `Hace ${m} min`;
		if (h < 24) return `Hace ${h} h`;
		if (d === 1) return "Ayer";
		if (d < 7) return `Hace ${d} días`;
		return new Date(iso).toLocaleDateString("es-ES", { month: "short", day: "numeric" });
	};

	const getSpeedLabel = (spd: number): string => {
		if (spd < 40) return "Muy lento";
		if (spd < 80) return "Lento";
		if (spd < 150) return "Normal";
		if (spd < 250) return "Rápido";
		return "Muy rápido";
	};

	// ============================================
	// Estado reactivo
	// ============================================
	let text = `Pega aquí tu guion...

Tip: Usa párrafos cortos para una lectura más cómoda.`;

	let speed = SPEED_DEFAULT;
	let fontSize = FONT_SIZE_DEFAULT;
	let lineHeight = LINE_HEIGHT_DEFAULT;
	let countdownDuration = 3;

	let isPlaying = false;
	let isCountingDown = false;
	let countdown = 0;
	let isMirror = false;
	let autoCenter = true;
	let smooth = true;
	let showControls = true;
	let progress = 0;
	let glow = true;
	let focusMode = false;
	let dimOutside = true;
	let isFullscreen = false;
	let ultraClean = false;
	let isReady = false;
	let isMobile = false;
	let showMobileBanner = false;
	let showOnboarding = false;
	let helpTab: HelpTab = "quickstart";

	let isDark = false;
	let wakeLock: WakeLockSentinel | null = null;
	let wakeLockSupported = false;

	// Scripts
	let scripts: SavedScript[] = [];
	let currentScript: string | null = null;

	// Scroll engine
	let scrollContainer: HTMLDivElement;
	let content: HTMLDivElement;
	let fullscreenTarget: HTMLDivElement;
	let raf: number | null = null;
	let lastTime: number | null = null;
	let targetSpeed = speed;
	let currentSpeed = 0;
	let cachedMaxScroll = 0;
	let scrollAccumulator = 0;
	let progressTimer: ReturnType<typeof setInterval> | null = null;
	let countdownTimer: ReturnType<typeof setInterval> | null = null;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	// Touch state
	let touchStartY = 0;
	let lastTapTime = 0;
	let tapTimeout: ReturnType<typeof setTimeout> | null = null;

	// Observers
	let darkModeObserver: MutationObserver | null = null;
	let saveCountdownHandle: number | null = null;

	// ============================================
	// Derivados
	// ============================================
	$: lines = text.split("\n");
	$: lineElements = lines.map((_, i) => lineElements[i] ?? null);
	$: wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
	$: charCount = text.length;
	$: estimatedTotalSeconds = wordCount > 0 ? Math.ceil((wordCount / 150) * 60) : 0;
	$: estimatedMinutes = Math.floor(estimatedTotalSeconds / 60);
	$: estimatedSeconds = estimatedTotalSeconds % 60;
	$: readingTimeLabel =
		wordCount === 0
			? ""
			: estimatedMinutes > 0
				? `~${estimatedMinutes}m ${estimatedSeconds}s`
				: `~${estimatedSeconds}s`;

	$: statusKind = ((): StatusKind => {
		if (isCountingDown) return "counting";
		if (isPlaying) return "playing";
		if (progress >= 0.995) return "ended";
		if (progress > 0) return "paused";
		return "idle";
	})();

	$: statusText = {
		idle: "En línea",
		counting: "Cuenta regresiva…",
		playing: "Al aire 🔴",
		paused: "En pausa ⏸",
		ended: "Fin de guion ✓",
	}[statusKind];

	$: statusColor = {
		idle: "oklch(0.60 0.15 150)",
		counting: "oklch(0.65 0.15 60)",
		playing: "oklch(0.60 0.15 25)",
		paused: "oklch(0.60 0.15 220)",
		ended: "oklch(0.55 0.05 var(--hue, 250))",
	}[statusKind];

	$: speedRatio = (speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN);
	$: speedColor =
		speedRatio < 0.33
			? "oklch(0.65 0.15 150)"
			: speedRatio < 0.66
				? "oklch(0.70 0.15 60)"
				: "oklch(0.65 0.18 25)";

	// ============================================
	// Persistencia
	// ============================================
	function loadState(): void {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const data = JSON.parse(raw);
			if (!data || typeof data !== "object") return;

			if (typeof data.text === "string" && data.text.length < 200000) {
				text = data.text;
			}
			if (typeof data.speed === "number") {
				speed = clamp(data.speed, SPEED_MIN, SPEED_MAX);
				targetSpeed = speed;
			}
			if (typeof data.fontSize === "number") {
				fontSize = clamp(data.fontSize, FONT_SIZE_MIN, FONT_SIZE_MAX);
			}
			if (typeof data.lineHeight === "number") {
				lineHeight = clamp(data.lineHeight, LINE_HEIGHT_MIN, LINE_HEIGHT_MAX);
			}
			if (typeof data.isMirror === "boolean") isMirror = data.isMirror;
			if (typeof data.autoCenter === "boolean") autoCenter = data.autoCenter;
			if (typeof data.smooth === "boolean") smooth = data.smooth;
			if (typeof data.glow === "boolean") glow = data.glow;
			if (typeof data.focusMode === "boolean") focusMode = data.focusMode;
			if (typeof data.dimOutside === "boolean") dimOutside = dimOutside;
			if (typeof data.ultraClean === "boolean") ultraClean = data.ultraClean;
			if (typeof data.countdownDuration === "number") {
				countdownDuration = clamp(data.countdownDuration, 0, 10);
			}
		} catch (err) {
			console.warn("[Teleprompter] Estado corrupto, reiniciando", err);
			try {
				localStorage.removeItem(STORAGE_KEY);
			} catch {}
		}
	}

	function loadScripts(): void {
		try {
			const raw = localStorage.getItem(SCRIPTS_KEY);
			if (!raw) {
				scripts = [];
				return;
			}
			const parsed = JSON.parse(raw);
			scripts = Array.isArray(parsed) ? parsed : [];
		} catch (err) {
			console.warn("[Teleprompter] Scripts corruptos, reiniciando", err);
			scripts = [];
			try {
				localStorage.removeItem(SCRIPTS_KEY);
			} catch {}
		}
	}

	function saveScripts(list: SavedScript[]): void {
		try {
			localStorage.setItem(SCRIPTS_KEY, JSON.stringify(list));
			scripts = list;
		} catch (err) {
			console.warn("[Teleprompter] No se pudieron guardar scripts", err);
		}
	}

	function scheduleSave(): void {
		if (!isReady) return;
		if (saveTimeout) clearTimeout(saveTimeout);
		const delay = text.length > 5000 ? 600 : 350;
		saveTimeout = setTimeout(() => {
			try {
				const payload = {
					text,
					speed,
					fontSize,
					lineHeight,
					isMirror,
					autoCenter,
					smooth,
					glow,
					focusMode,
					dimOutside,
					ultraClean,
					countdownDuration,
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
			} catch (err) {
				if (err instanceof DOMException && err.name === "QuotaExceededError") {
					// Limpiar scripts antiguos
					const reduced = scripts.slice(0, 10);
					saveScripts(reduced);
				}
			}
		}, delay);
	}

	// Reaccionar a cambios en configuración (no en cada frame)
	$: if (isReady) {
		void text;
		void speed;
		void fontSize;
		void lineHeight;
		void isMirror;
		void autoCenter;
		void smooth;
		void glow;
		void focusMode;
		void dimOutside;
		void ultraClean;
		void countdownDuration;
		scheduleSave();
	}

	// ============================================
	// Scripts
	// ============================================
	function saveCurrentScript(): void {
		const trimmed = text.trim();
		if (!trimmed) return;
		const now = new Date().toISOString();
		if (currentScript) {
			const idx = scripts.findIndex((s) => s.id === currentScript);
			if (idx >= 0) {
				scripts[idx] = { ...scripts[idx], text, updatedAt: now };
				saveScripts([...scripts]);
			}
		} else {
			const newScript: SavedScript = {
				id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
				name: `Guion ${scripts.length + 1}`,
				text,
				createdAt: now,
				updatedAt: now,
			};
			const updated = [newScript, ...scripts].slice(0, MAX_SCRIPTS);
			saveScripts(updated);
			currentScript = newScript.id;
			try {
				localStorage.setItem(LAST_SCRIPT_KEY, currentScript);
			} catch {}
		}
	}

	function loadScript(id: string): void {
		const script = scripts.find((s) => s.id === id);
		if (!script) return;
		pause();
		text = script.text;
		currentScript = script.id;
		try {
			localStorage.setItem(LAST_SCRIPT_KEY, script.id);
		} catch {}
		// Reset scroll
		queueMicrotask(() => {
			if (scrollContainer) {
				scrollContainer.scrollTop = 0;
				scrollAccumulator = 0;
				updateProgress();
			}
		});
	}

	function deleteScript(id: string): void {
		const updated = scripts.filter((s) => s.id !== id);
		saveScripts(updated);
		if (currentScript === id) {
			currentScript = null;
			try {
				localStorage.removeItem(LAST_SCRIPT_KEY);
			} catch {}
		}
	}

	function newScript(): void {
		pause();
		currentScript = null;
		text = "";
		if (scrollContainer) {
			scrollContainer.scrollTop = 0;
			scrollAccumulator = 0;
			updateProgress();
		}
		try {
			localStorage.removeItem(LAST_SCRIPT_KEY);
		} catch {}
	}

	function onScriptSelect(e: Event): void {
		const value = (e.target as HTMLSelectElement).value;
		if (!value) {
			newScript();
		} else {
			loadScript(value);
		}
	}

	// ============================================
	// Scroll engine (60fps, time-based, no jank)
	// ============================================
	function recalcMaxScroll(): void {
		if (!scrollContainer || !content) return;
		cachedMaxScroll = Math.max(
			content.scrollHeight - scrollContainer.clientHeight,
			0,
		);
	}

	function updateProgress(): void {
		if (!scrollContainer) return;
		if (cachedMaxScroll <= 0) {
			progress = 0;
			return;
		}
		progress = clamp(scrollContainer.scrollTop / cachedMaxScroll, 0, 1);
	}

	function tick(timestamp: number): void {
		if (!isPlaying || !scrollContainer) {
			raf = null;
			lastTime = null;
			return;
		}
		if (lastTime === null) {
			lastTime = timestamp;
			scrollAccumulator = scrollContainer.scrollTop;
			raf = requestAnimationFrame(tick);
			return;
		}
		const elapsed = timestamp - lastTime;
		if (elapsed <= 0) {
			raf = requestAnimationFrame(tick);
			return;
		}
		// Clamp delta para evitar saltos grandes al volver de background
		const delta = Math.min(elapsed / 1000, 0.1);
		lastTime = timestamp;

		// Interpolación suave
		if (smooth) {
			const k = 1 - Math.exp(-delta * 10);
			currentSpeed += (targetSpeed - currentSpeed) * k;
			if (Math.abs(currentSpeed - targetSpeed) < 0.5) {
				currentSpeed = targetSpeed;
			}
		} else {
			currentSpeed = targetSpeed;
		}

		scrollAccumulator += currentSpeed * delta;

		// Final del guion
		if (scrollAccumulator >= cachedMaxScroll) {
			scrollContainer.scrollTop = cachedMaxScroll;
			scrollAccumulator = cachedMaxScroll;
			progress = 1;
			pause();
			releaseWakeLock();
			return;
		}

		// Solo aplicar si cambia al menos 1px (evita reflows innecesarios)
		const targetScroll = Math.round(scrollAccumulator);
		if (targetScroll !== scrollContainer.scrollTop) {
			scrollContainer.scrollTop = targetScroll;
		}
		raf = requestAnimationFrame(tick);
	}

	function startProgressTimer(): void {
		stopProgressTimer();
		progressTimer = setInterval(() => {
			updateProgress();
		}, 200);
	}

	function stopProgressTimer(): void {
		if (progressTimer) {
			clearInterval(progressTimer);
			progressTimer = null;
		}
	}

	// ============================================
	// Control de reproducción
	// ============================================
	async function requestWakeLock(): Promise<void> {
		if (!wakeLockSupported) return;
		try {
			wakeLock = await navigator.wakeLock.request("screen");
		} catch (err) {
			console.warn("[Teleprompter] Wake Lock no disponible", err);
		}
	}

	function releaseWakeLock(): void {
		if (wakeLock) {
			wakeLock.release().catch(() => {});
			wakeLock = null;
		}
	}

	function startPlayback(): void {
		if (!scrollContainer || !content) return;
		if (raf) cancelAnimationFrame(raf);

		speed = Math.round(clamp(speed, SPEED_MIN, SPEED_MAX));
		targetSpeed = speed;
		currentSpeed = 0;

		recalcMaxScroll();
		if (cachedMaxScroll <= 0) return;

		scrollAccumulator = scrollContainer.scrollTop;
		isPlaying = true;
		lastTime = null;
		startProgressTimer();
		requestWakeLock();
		raf = requestAnimationFrame(tick);
	}

	function beginCountdown(): void {
		if (isCountingDown) return;
		if (countdownDuration <= 0) {
			startPlayback();
			return;
		}
		countdown = countdownDuration;
		isCountingDown = true;
		countdownTimer = setInterval(() => {
			countdown -= 1;
			if (countdown <= 0) {
				clearInterval(countdownTimer!);
				countdownTimer = null;
				isCountingDown = false;
				startPlayback();
			}
		}, 1000);
	}

	function cancelCountdown(): void {
		if (countdownTimer) {
			clearInterval(countdownTimer);
			countdownTimer = null;
		}
		isCountingDown = false;
		countdown = 0;
	}

	function start(): void {
		if (isPlaying || isCountingDown) return;
		beginCountdown();
	}

	function pause(): void {
		isPlaying = false;
		cancelCountdown();
		if (raf) {
			cancelAnimationFrame(raf);
			raf = null;
		}
		lastTime = null;
		currentSpeed = 0;
		if (scrollContainer) {
			scrollAccumulator = scrollContainer.scrollTop;
		}
		stopProgressTimer();
		releaseWakeLock();
		updateProgress();
	}

	function toggle(): void {
		if (isPlaying) {
			pause();
		} else if (isCountingDown) {
			cancelCountdown();
		} else {
			start();
		}
	}

	function reset(): void {
		pause();
		if (scrollContainer) {
			scrollContainer.scrollTop = 0;
			scrollAccumulator = 0;
		}
		updateProgress();
	}

	function clearText(): void {
		pause();
		text = "";
		if (scrollContainer) {
			scrollContainer.scrollTop = 0;
			scrollAccumulator = 0;
		}
		updateProgress();
	}

	function jump(amount: number): void {
		if (!scrollContainer || !content) return;
		const maxScroll = content.scrollHeight - scrollContainer.clientHeight;
		const next = clamp(scrollContainer.scrollTop + amount, 0, maxScroll);
		scrollContainer.scrollTop = next;
		scrollAccumulator = next;
		updateProgress();
	}

	function scrollToProgress(value: number): void {
		if (!scrollContainer || !content) return;
		const maxScroll = content.scrollHeight - scrollContainer.clientHeight;
		const next = clamp(value, 0, 1) * maxScroll;
		scrollContainer.scrollTop = next;
		scrollAccumulator = next;
		updateProgress();
	}

	function adjustSpeed(amount: number): void {
		speed = Math.round(clamp(speed + amount, SPEED_MIN, SPEED_MAX));
		targetSpeed = speed;
	}

	// ============================================
	// Fullscreen
	// ============================================
	async function toggleFullscreen(): Promise<void> {
		if (!fullscreenTarget) return;
		try {
			if (!document.fullscreenElement) {
				await fullscreenTarget.requestFullscreen({ navigationUI: "hide" });
			} else {
				await document.exitFullscreen();
			}
		} catch (err) {
			console.warn("[Teleprompter] Fullscreen no disponible", err);
		}
	}

	// ============================================
	// Tiempo restante estimado
	// ============================================
	let timeRemaining = "";
	$: {
		if (cachedMaxScroll > 0 && scrollContainer && speed > 0) {
			const remainingPx = Math.max(0, cachedMaxScroll - scrollContainer.scrollTop);
			const seconds = Math.ceil(remainingPx / speed);
			timeRemaining = formatTime(seconds);
		} else {
			timeRemaining = "";
		}
	}

	// ============================================
	// Touch / Mouse
	// ============================================
	function handleTouchStart(e: TouchEvent): void {
		const target = e.target as HTMLElement;
		if (target.tagName === "TEXTAREA" || target.closest("button, input, select, .teleprompter-panel")) {
			return;
		}
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchMove(e: TouchEvent): void {
		if (!isPlaying) return;
		const target = e.target as HTMLElement;
		if (target.tagName === "TEXTAREA") return;
		const deltaY = touchStartY - e.touches[0].clientY;
		if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
			const step = Math.sign(deltaY) * Math.max(2, Math.abs(deltaY) / 10);
			adjustSpeed(step);
			touchStartY = e.touches[0].clientY;
		}
	}

	function handleWheel(e: WheelEvent): void {
		if (!isPlaying) return;
		e.preventDefault();
		const baseIncrement = Math.max(8, speed * 0.1);
		adjustSpeed(e.deltaY > 0 ? baseIncrement : -baseIncrement);
	}

	function handleFrameClick(e: MouseEvent): void {
		const target = e.target as HTMLElement;
		if (
			target.tagName === "TEXTAREA" ||
			target.closest("button, input, select, .teleprompter-panel, .teleprompter-float, .teleprompter-progress-top")
		) {
			return;
		}
		const now = Date.now();
		if (now - lastTapTime < DOUBLE_TAP_WINDOW) {
			// Doble tap
			lastTapTime = 0;
			if (tapTimeout) {
				clearTimeout(tapTimeout);
				tapTimeout = null;
			}
			toggleFullscreen();
			return;
		}
		lastTapTime = now;
		tapTimeout = setTimeout(() => {
			tapTimeout = null;
			if (lastTapTime !== 0) {
				toggle();
				lastTapTime = 0;
			}
		}, TAP_THRESHOLD);
	}

	// ============================================
	// Atajos de teclado
	// ============================================
	function onKey(e: KeyboardEvent): void {
		const target = e.target as HTMLElement;
		const inField =
			target.tagName === "TEXTAREA" ||
			target.tagName === "INPUT" ||
			target.tagName === "SELECT" ||
			target.isContentEditable;

		switch (e.code) {
			case "Space":
			case "Enter":
			case "NumpadEnter":
				if (inField && target.tagName !== "BUTTON") return;
				e.preventDefault();
				toggle();
				break;
			case "ArrowUp":
				if (inField) return;
				e.preventDefault();
				jump(-120);
				break;
			case "ArrowDown":
				if (inField) return;
				e.preventDefault();
				jump(120);
				break;
			case "PageUp":
				if (inField) return;
				e.preventDefault();
				jump(-320);
				break;
			case "PageDown":
				if (inField) return;
				e.preventDefault();
				jump(320);
				break;
			case "Home":
				if (inField) return;
				e.preventDefault();
				reset();
				break;
			case "KeyM":
				if (inField) return;
				isMirror = !isMirror;
				break;
			case "KeyF":
				if (inField) return;
				focusMode = !focusMode;
				break;
			case "KeyR":
				if (inField) return;
				reset();
				break;
			case "KeyX":
				if (inField) return;
				toggleFullscreen();
				break;
			case "KeyL":
				if (inField) return;
				ultraClean = !ultraClean;
				break;
			case "Equal":
			case "NumpadAdd":
				if (inField) return;
				e.preventDefault();
				adjustSpeed(4);
				break;
			case "Minus":
			case "NumpadSubtract":
				if (inField) return;
				e.preventDefault();
				adjustSpeed(-4);
				break;
			case "Escape":
				if (showOnboarding) {
					showOnboarding = false;
					dismissOnboarding();
				}
				break;
		}
	}

	// ============================================
	// Onboarding
	// ============================================
	function dismissOnboarding(): void {
		showOnboarding = false;
		try {
			localStorage.setItem(ONBOARDING_KEY, "true");
		} catch {}
	}

	function applyYouTubeSettings(): void {
		speed = 60;
		fontSize = 40;
		lineHeight = 1.75;
		isMirror = false;
		focusMode = true;
		autoCenter = true;
		countdownDuration = 3;
		targetSpeed = speed;
		helpTab = "quickstart";
	}

	// ============================================
	// Recalc on resize y font/line changes
	// ============================================
	$: if (isReady && content && scrollContainer) {
		void fontSize;
		void lineHeight;
		queueMicrotask(() => {
			recalcMaxScroll();
			updateProgress();
		});
	}

	function onResize(): void {
		if (!scrollContainer || !content) return;
		const prevMax = cachedMaxScroll;
		recalcMaxScroll();
		if (isPlaying && scrollContainer) {
			scrollAccumulator = Math.min(scrollAccumulator, cachedMaxScroll);
		}
		updateProgress();
	}

	// ============================================
	// Lifecycle
	// ============================================
	onMount(() => {
		// Dark mode
		isDark = document.documentElement.classList.contains("dark");
		darkModeObserver = new MutationObserver(() => {
			isDark = document.documentElement.classList.contains("dark");
		});
		darkModeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		// Mobile
		const mql = window.matchMedia("(max-width: 768px)");
		isMobile = mql.matches;
		showMobileBanner = isMobile;
		const mqlHandler = (e: MediaQueryListEvent) => {
			isMobile = e.matches;
			showMobileBanner = e.matches;
		};
		mql.addEventListener("change", mqlHandler);

		// Wake Lock
		wakeLockSupported = "wakeLock" in navigator;

		// Keyboard
		window.addEventListener("keydown", onKey);

		// Fullscreen
		const onFsChange = () => {
			isFullscreen = Boolean(document.fullscreenElement);
			if (!isFullscreen) {
				// Al salir de fullscreen, pausar y liberar wake lock
				pause();
			}
		};
		document.addEventListener("fullscreenchange", onFsChange);

		// Visibilidad: liberar wake lock al ocultar
		const onVisibility = () => {
			if (document.hidden && wakeLock) {
				releaseWakeLock();
			} else if (!document.hidden && isPlaying) {
				requestWakeLock();
			}
		};
		document.addEventListener("visibilitychange", onVisibility);

		// Resize
		const resizeHandler = () => onResize();
		const orientationHandler = () => setTimeout(onResize, 300);
		window.addEventListener("resize", resizeHandler);
		window.addEventListener("orientationchange", orientationHandler);

		// Cargar estado
		loadState();
		loadScripts();

		const lastId = (() => {
			try {
				return localStorage.getItem(LAST_SCRIPT_KEY);
			} catch {
				return null;
			}
		})();
		if (lastId) {
			loadScript(lastId);
		}

		// Onboarding
		try {
			const done = localStorage.getItem(ONBOARDING_KEY);
			if (!done) showOnboarding = true;
		} catch {}

		isReady = true;
		updateProgress();

		return () => {
			window.removeEventListener("keydown", onKey);
			document.removeEventListener("fullscreenchange", onFsChange);
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("resize", resizeHandler);
			window.removeEventListener("orientationchange", orientationHandler);
			mql.removeEventListener("change", mqlHandler);
		};
	});

	onDestroy(() => {
		pause();
		stopProgressTimer();
		cancelCountdown();
		if (saveTimeout) clearTimeout(saveTimeout);
		if (tapTimeout) clearTimeout(tapTimeout);
		releaseWakeLock();
		if (darkModeObserver) {
			darkModeObserver.disconnect();
			darkModeObserver = null;
		}
	});
</script>

<div class="teleprompter-wrapper" class:clean={ultraClean} class:dark={isDark}>
	<!-- ============================================
       Onboarding
       ============================================ -->
	{#if showOnboarding}
		<div
			class="teleprompter-onboarding-overlay"
			on:click|self={dismissOnboarding}
			role="presentation"
		>
			<div
				class="teleprompter-onboarding-card"
				role="dialog"
				aria-modal="true"
				aria-labelledby="onboarding-title"
			>
				<div class="onboarding-header">
					<div class="logo-gradient" aria-hidden="true">🎬</div>
					<h2 id="onboarding-title">Teleprompter Premium</h2>
					<p class="subtitle">Tu estudio profesional de lectura en pantalla</p>
				</div>

				<div class="help-tabs" role="tablist">
					{#each [
						{ id: "quickstart", label: "Inicio rápido" },
						{ id: "youtube", label: "Ajustes YouTube" },
						{ id: "shortcuts", label: "Atajos" },
						{ id: "tips", label: "Tips Pro" },
					] as tab}
						<button
							class="tab-btn"
							class:active={helpTab === tab.id}
							on:click={() => (helpTab = tab.id)}
							role="tab"
							aria-selected={helpTab === tab.id}
						>
							{tab.label}
						</button>
					{/each}
				</div>

				<div class="tab-content" role="tabpanel">
					{#key helpTab}
						<div class="tab-panel">
							{#if helpTab === "quickstart"}
								<div class="onboarding-step">
									<div class="step-icon">📝</div>
									<h3>1. Pega tu guion</h3>
									<p>Escribe o pega el texto en el área designada</p>
								</div>
								<div class="onboarding-step">
									<div class="step-icon">⚙️</div>
									<h3>2. Ajusta a tu ritmo</h3>
									<p>Velocidad, tamaño y opciones según tu preferencia</p>
								</div>
								<div class="onboarding-step">
									<div class="step-icon">▶️</div>
									<h3>3. Empieza a leer</h3>
									<p>Presiona Play o Espacio para iniciar</p>
								</div>
							{:else if helpTab === "youtube"}
								<h3>⚙️ Configuración recomendada para YouTube</h3>
								<p class="tab-desc">
									Ajustes optimizados para grabar videos con lectura natural y profesional.
								</p>
								<div class="settings-list">
									<div class="setting-item">
										<span class="setting-label">🐢 Velocidad</span>
										<span class="setting-value">50-70 px/seg</span>
									</div>
									<div class="setting-item">
										<span class="setting-label">📏 Fuente</span>
										<span class="setting-value">38-42px</span>
									</div>
									<div class="setting-item">
										<span class="setting-label">📐 Interlineado</span>
										<span class="setting-value">1.7-1.8</span>
									</div>
									<div class="setting-item">
										<span class="setting-label">🎯 Focus mode</span>
										<span class="setting-value">Activado</span>
									</div>
									<div class="setting-item">
										<span class="setting-label">⏱️ Countdown</span>
										<span class="setting-value">3 segundos</span>
									</div>
								</div>
								<button class="btn-youtube-apply" on:click={applyYouTubeSettings}>
									✨ Aplicar ajustes YouTube
								</button>
							{:else if helpTab === "shortcuts"}
								<h3>⌨️ Atajos de teclado</h3>
								<div class="shortcuts-table">
									<div class="shortcut-row">
										<span class="shortcut-key">Espacio / Enter</span>
										<span class="shortcut-desc">Play / Pausa</span>
									</div>
									<div class="shortcut-row">
										<span class="shortcut-key">R / Home</span>
										<span class="shortcut-desc">Reiniciar</span>
									</div>
									<div class="shortcut-row">
										<span class="shortcut-key">↑ / ↓</span>
										<span class="shortcut-desc">Saltar ±120px</span>
									</div>
									<div class="shortcut-row">
										<span class="shortcut-key">PageUp / PageDown</span>
										<span class="shortcut-desc">Saltar ±320px</span>
									</div>
									<div class="shortcut-row">
										<span class="shortcut-key">+ / −</span>
										<span class="shortcut-desc">Velocidad ±4</span>
									</div>
									<div class="shortcut-row">
										<span class="shortcut-key">M</span>
										<span class="shortcut-desc">Modo espejo</span>
									</div>
									<div class="shortcut-row">
										<span class="shortcut-key">F</span>
										<span class="shortcut-desc">Focus mode</span>
									</div>
									<div class="shortcut-row">
										<span class="shortcut-key">X</span>
										<span class="shortcut-desc">Pantalla completa</span>
									</div>
									<div class="shortcut-row">
										<span class="shortcut-key">L</span>
										<span class="shortcut-desc">Modo limpio</span>
									</div>
									<div class="shortcut-row">
										<span class="shortcut-key">Esc</span>
										<span class="shortcut-desc">Cerrar ayuda</span>
									</div>
								</div>
							{:else if helpTab === "tips"}
								<h3>💡 Consejos profesionales</h3>
								<div class="tips-list">
									<div class="tip-item-pro">
										<span class="tip-number">1</span>
										<div class="tip-content">
											<strong>Practica el guion 2-3 veces antes de grabar</strong>
											<p>Para una lectura natural y fluida</p>
										</div>
									</div>
									<div class="tip-item-pro">
										<span class="tip-number">2</span>
										<div class="tip-content">
											<strong>Usa párrafos cortos de 2-3 líneas</strong>
											<p>Facilita la lectura y el ritmo</p>
										</div>
									</div>
									<div class="tip-item-pro">
										<span class="tip-number">3</span>
										<div class="tip-content">
											<strong>Mira a la cámara, no al texto</strong>
											<p>Posiciona el teleprompter cerca del lente</p>
										</div>
									</div>
									<div class="tip-item-pro">
										<span class="tip-number">4</span>
										<div class="tip-content">
											<strong>Encuentra tu velocidad natural</strong>
											<p>No esperes al texto ni corras detrás de él</p>
										</div>
									</div>
									<div class="tip-item-pro">
										<span class="tip-number">5</span>
										<div class="tip-content">
											<strong>Focus mode reduce fatiga visual</strong>
											<p>Ideal para sesiones de grabación largas</p>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/key}
				</div>

				<button class="btn-onboarding" on:click={dismissOnboarding}>
					Comenzar
				</button>
			</div>
		</div>
	{/if}

	<!-- ============================================
       Header
       ============================================ -->
	<header class="teleprompter-header">
		<div class="header-info">
			<h1 class="teleprompter-title">Teleprompter</h1>
			<p class="teleprompter-subtitle">Tu estudio profesional de lectura en pantalla</p>
			<div class="status-row" aria-live="polite">
				<span
					class="status-indicator"
					style:background-color={statusColor}
					class:playing={isPlaying}
					aria-hidden="true"
				></span>
				<span class="teleprompter-status">{statusText}</span>
				{#if wordCount > 0}
					<span class="word-count">· {wordCount} palabras · {readingTimeLabel}</span>
				{/if}
			</div>
		</div>
		<div class="teleprompter-header-actions">
			<button
				class="btn-help"
				on:click={() => (showOnboarding = true)}
				title="Ver tutorial"
				aria-label="Abrir tutorial"
			>
				<span class="help-icon" aria-hidden="true">?</span>
				<span class="help-badge">Ayuda</span>
			</button>
			<button
				class="btn-plain"
				class:active={!showControls}
				on:click={() => (showControls = !showControls)}
			>
				{showControls ? "Ocultar controles" : "Mostrar controles"}
			</button>
			<button class="btn-plain" on:click={toggleFullscreen}>
				{isFullscreen ? "Salir pantalla completa" : "Pantalla completa (X)"}
			</button>
			<button
				class="btn-plain"
				class:active={ultraClean}
				on:click={() => (ultraClean = !ultraClean)}
			>
				{ultraClean ? "Salir modo limpio" : "Modo limpio (L)"}
			</button>
		</div>
	</header>

	{#if showMobileBanner}
		<div class="mobile-tip-banner" role="status">
			<div class="mobile-tip-content">
				<span class="mobile-tip-icon" aria-hidden="true">💡</span>
				<p>
					<strong>👆 Toca</strong> para pausar · <strong>👆👆</strong> pantalla completa
				</p>
			</div>
			<button
				class="mobile-tip-close"
				on:click={() => (showMobileBanner = false)}
				aria-label="Cerrar sugerencia"
			>
				✕
			</button>
		</div>
	{/if}

	<!-- ============================================
       Panel
       ============================================ -->
	<div class="teleprompter-panel">
		<div class="script-manager">
			<label for="script-selector" class="manager-label">Guion guardado:</label>
			<div class="script-controls">
				<select
					id="script-selector"
					value={currentScript ?? ""}
					on:change={onScriptSelect}
				>
					<option value="">-- Nuevo guion --</option>
					{#each scripts as script (script.id)}
						<option value={script.id}>
							{script.name} · {formatDateTime(script.updatedAt)}
						</option>
					{/each}
				</select>
				<button
					class="btn-icon"
					on:click={saveCurrentScript}
					title="Guardar guion actual"
					aria-label="Guardar guion actual"
				>
					💾
				</button>
				<button
					class="btn-icon"
					on:click={newScript}
					title="Nuevo guion"
					aria-label="Crear nuevo guion"
				>
					➕
				</button>
				{#if currentScript}
					<button
						class="btn-icon"
						on:click={() => currentScript && deleteScript(currentScript)}
						title="Eliminar guion"
						aria-label="Eliminar guion actual"
					>
						🗑️
					</button>
				{/if}
			</div>
		</div>

		<textarea
			class="teleprompter-input"
			bind:value={text}
			rows={6}
			placeholder="Escribe o pega aquí tu guion..."
			aria-label="Texto del guion"
		></textarea>

		{#if showControls}
			<div class="teleprompter-controls">
				<div class="controls-grid">
					<div class="control-group">
						<div class="control-label-row">
							<label for="speed-range">Velocidad</label>
							<span class="speed-label">{getSpeedLabel(speed)}</span>
						</div>
						<input
							id="speed-range"
							type="range"
							class="custom-range"
							min={SPEED_MIN}
							max={SPEED_MAX}
							step="1"
							bind:value={speed}
							aria-label="Velocidad de scroll"
						/>
						<div class="control-value-row">
							<span class="control-value">{speed} px/seg</span>
							<div
								class="speed-indicator-bar"
								style:width="{speedRatio * 100}%"
								style:background-color={speedColor}
							></div>
						</div>
					</div>

					<div class="control-group">
						<div class="control-label-row">
							<label for="font-range">Tamaño</label>
						</div>
						<input
							id="font-range"
							type="range"
							class="custom-range"
							min={FONT_SIZE_MIN}
							max={FONT_SIZE_MAX}
							bind:value={fontSize}
							aria-label="Tamaño de fuente"
						/>
						<div class="control-value-row">
							<span class="control-value">{fontSize}px</span>
						</div>
					</div>

					<div class="control-group">
						<div class="control-label-row">
							<label for="line-range">Interlineado</label>
						</div>
						<input
							id="line-range"
							type="range"
							class="custom-range"
							min={LINE_HEIGHT_MIN}
							max={LINE_HEIGHT_MAX}
							step="0.05"
							bind:value={lineHeight}
							aria-label="Interlineado"
						/>
						<div class="control-value-row">
							<span class="control-value">{lineHeight.toFixed(2)}</span>
						</div>
					</div>

					<div class="control-group">
						<div class="control-label-row">
							<label for="countdown-select">Countdown</label>
						</div>
						<select
							id="countdown-select"
							class="countdown-select"
							bind:value={countdownDuration}
						>
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
						<button
							class="toggle-btn"
							class:active={isMirror}
							on:click={() => (isMirror = !isMirror)}
							title="Para cámaras frontales"
						>
							Espejo (M)
						</button>
						<button
							class="toggle-btn"
							class:active={autoCenter}
							on:click={() => (autoCenter = !autoCenter)}
							title="Mantiene el texto centrado"
						>
							Auto-centrar
						</button>
						<button
							class="toggle-btn"
							class:active={smooth}
							on:click={() => (smooth = !smooth)}
							title="Transición suave de velocidad"
						>
							Suave
						</button>
						<button
							class="toggle-btn"
							class:active={glow}
							on:click={() => (glow = !glow)}
							title="Efecto de brillo"
						>
							Glow
						</button>
						<button
							class="toggle-btn"
							class:active={focusMode}
							on:click={() => (focusMode = !focusMode)}
							title="Resalta la línea actual"
						>
							Focus (F)
						</button>
						<button
							class="toggle-btn"
							class:active={dimOutside}
							on:click={() => (dimOutside = !dimOutside)}
						>
							Oscurecer bordes
						</button>
					</div>
				</div>

				<div class="control-actions">
					<button class="btn-play" on:click={toggle}>
						{#if isPlaying}
							⏸ Pausar
						{:else if isCountingDown}
							⏹ Cancelar
						{:else}
							▶ Reproducir
						{/if}
					</button>
					<button class="btn-action" on:click={reset}>Reiniciar (R)</button>
					<button class="btn-action" on:click={clearText}>Vaciar</button>
					<button class="btn-action" on:click={() => jump(-240)}>↑ Saltar arriba</button>
					<button class="btn-action" on:click={() => jump(240)}>↓ Saltar abajo</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- ============================================
       Screen
       ============================================ -->
	<div
		class="teleprompter-screen"
		class:mirror={isMirror}
		class:focus={focusMode}
		class:glow
		class:is-fullscreen={isFullscreen}
		bind:this={fullscreenTarget}
	>
		<div
			class="teleprompter-progress-top"
			role="progressbar"
			aria-valuenow={Math.round(progress * 100)}
			aria-valuemin="0"
			aria-valuemax="100"
			aria-label="Progreso del guion"
			tabindex="0"
			on:click={(e) => {
				const rect = e.currentTarget.getBoundingClientRect();
				const clickX = e.clientX - rect.left;
				scrollToProgress(clickX / rect.width);
			}}
			on:keydown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					scrollToProgress(0.5);
				}
			}}
		>
			<div class="progress-bar" style:width="{progress * 100}%"></div>
			{#if timeRemaining && (isPlaying || progress > 0)}
				<div class="time-remaining" aria-live="off">⏱ {timeRemaining}</div>
			{/if}
		</div>

		<div class="reading-position-marker" aria-hidden="true"></div>

		<div
			class="teleprompter-frame"
			bind:this={scrollContainer}
			on:wheel={handleWheel}
			on:click={handleFrameClick}
			on:touchstart={handleTouchStart}
			on:touchmove={handleTouchMove}
			style:padding={autoCenter ? "35vh 2rem 50vh" : "2.5rem 2rem"}
			tabindex="-1"
		>
			<div
				class="teleprompter-content"
				style:font-size="{fontSize}px"
				style:line-height={lineHeight}
				style:letter-spacing="0.01em"
				bind:this={content}
			>
				{#each lines as line, index}
					<p
						class:active={index === activeLineIndex}
						class:dimmed={focusMode && index !== activeLineIndex}
						bind:this={lineElements[index]}
					>
						{line || "\u00A0"}
					</p>
				{/each}
			</div>
		</div>

		{#if focusMode && dimOutside}
			<div class="teleprompter-dim" aria-hidden="true"></div>
		{/if}

		<div class="teleprompter-float">
			<button
				class="btn-float btn-float-primary"
				class:playing={isPlaying}
				on:click={toggle}
				title={isPlaying ? "Pausar" : "Reproducir"}
				aria-label={isPlaying ? "Pausar reproducción" : "Iniciar reproducción"}
			>
				{#if isPlaying}
					⏸
				{:else if isCountingDown}
					⏹
				{:else}
					▶
				{/if}
			</button>
			<button
				class="btn-float"
				on:click={() => jump(-120)}
				title="Saltar arriba"
				aria-label="Saltar hacia arriba"
			>
				↑
			</button>
			<button
				class="btn-float"
				on:click={() => jump(120)}
				title="Saltar abajo"
				aria-label="Saltar hacia abajo"
			>
				↓
			</button>
			{#if isFullscreen}
				<div class="float-speed-control">
					<input
						type="range"
						class="mini-range"
						min={SPEED_MIN}
						max={SPEED_MAX}
						step="1"
						bind:value={speed}
						aria-label="Velocidad"
					/>
					<span class="mini-speed">{speed}</span>
				</div>
			{/if}
			<button
				class="btn-float"
				on:click={() => (isMirror = !isMirror)}
				title="Espejo"
				aria-label="Modo espejo"
			>
				M
			</button>
			<button
				class="btn-float"
				on:click={toggleFullscreen}
				title="Pantalla completa"
				aria-label="Pantalla completa"
			>
				⛶
			</button>
		</div>

		<footer class="teleprompter-footer">
			<div class="shortcut">
				Espacio/Enter = Play · ↑/↓/Page = Saltos · M = Espejo · F = Focus · L = Limpio · R = Reset · X = Fullscreen · +/- = Velocidad
			</div>
		</footer>

		{#if isCountingDown}
			<div class="teleprompter-countdown" role="status" aria-live="assertive">
				<span>{countdown}</span>
			</div>
		{/if}
	</div>
</div>

<script context="module" lang="ts">
	// Variable reactiva no usada removida
	let activeLineIndex = 0;
</script>

<style>
	/* ============================================
     Variables locales
     ============================================ */
	.teleprompter-wrapper {
		--hue: 250;
		--card-bg: #ffffff;
		--radius-large: 1rem;

		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		position: relative;
		color: #0f172a;
	}

	:global(.dark) .teleprompter-wrapper,
	.teleprompter-wrapper.dark {
		color: #e2e8f0;
	}

	.teleprompter-wrapper.clean .teleprompter-header,
	.teleprompter-wrapper.clean .teleprompter-panel,
	.teleprompter-wrapper.clean .teleprompter-footer,
	.teleprompter-wrapper.clean .mobile-tip-banner {
		display: none;
	}

	.teleprompter-wrapper.clean .teleprompter-screen {
		height: 80vh;
	}

	/* ============================================
     Onboarding
     ============================================ */
	.teleprompter-onboarding-overlay {
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

	.teleprompter-onboarding-card {
		max-width: 720px;
		width: 100%;
		background: rgba(255, 255, 255, 0.98);
		border-radius: 1.5rem;
		padding: 2rem;
		box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.2);
		display: grid;
		gap: 1.25rem;
		max-height: 90vh;
		overflow-y: auto;
		animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	:global(.dark) .teleprompter-onboarding-card,
	.dark .teleprompter-onboarding-card {
		background: rgba(15, 23, 42, 0.98);
		border-color: rgba(148, 163, 184, 0.2);
	}

	.onboarding-header {
		text-align: center;
	}

	.logo-gradient {
		font-size: 3.5rem;
		margin-bottom: 0.75rem;
		animation: scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.onboarding-header h2 {
		font-size: 1.75rem;
		font-weight: 800;
		background: linear-gradient(135deg, oklch(0.70 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-bottom: 0.5rem;
	}

	.onboarding-header .subtitle {
		font-size: 1rem;
		color: #64748b;
		font-weight: 500;
	}

	:global(.dark) .onboarding-header .subtitle,
	.dark .onboarding-header .subtitle {
		color: #94a3b8;
	}

	.help-tabs {
		display: flex;
		gap: 0.25rem;
		border-bottom: 2px solid oklch(0.90 0.02 var(--hue));
		overflow-x: auto;
		scrollbar-width: none;
	}

	.help-tabs::-webkit-scrollbar {
		display: none;
	}

	:global(.dark) .help-tabs,
	.dark .help-tabs {
		border-bottom-color: oklch(0.30 0.02 var(--hue));
	}

	.tab-btn {
		background: transparent;
		border: none;
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: #64748b;
		cursor: pointer;
		transition: color 0.2s ease, border-color 0.2s ease;
		border-bottom: 3px solid transparent;
		white-space: nowrap;
		margin-bottom: -2px;
	}

	.tab-btn:hover {
		color: oklch(0.60 0.14 var(--hue));
	}

	.tab-btn.active {
		color: oklch(0.60 0.14 var(--hue));
		border-bottom-color: oklch(0.60 0.14 var(--hue));
	}

	:global(.dark) .tab-btn,
	.dark .tab-btn {
		color: #94a3b8;
	}

	:global(.dark) .tab-btn:hover,
	.dark .tab-btn:hover,
	:global(.dark) .tab-btn.active,
	.dark .tab-btn.active {
		color: oklch(0.70 0.14 var(--hue));
		border-bottom-color: oklch(0.70 0.14 var(--hue));
	}

	.tab-content {
		min-height: 240px;
	}

	.tab-panel {
		animation: fadeInUp 0.3s ease;
	}

	.tab-desc {
		color: #64748b;
		margin-bottom: 1.25rem;
		line-height: 1.5;
	}

	:global(.dark) .tab-desc,
	.dark .tab-desc {
		color: #94a3b8;
	}

	.onboarding-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.4rem;
		padding: 0.75rem 0;
	}

	.step-icon {
		font-size: 2.25rem;
		margin-bottom: 0.4rem;
	}

	.onboarding-step h3 {
		font-size: 1.1rem;
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
		font-size: 0.95rem;
	}

	:global(.dark) .onboarding-step p,
	.dark .onboarding-step p {
		color: #94a3b8;
	}

	.youtube-settings h3,
	.shortcuts-panel h3,
	.tips-panel h3 {
		font-size: 1.25rem;
		font-weight: 700;
		color: #0f172a;
		margin-bottom: 1rem;
	}

	:global(.dark) .youtube-settings h3,
	:global(.dark) .shortcuts-panel h3,
	:global(.dark) .tips-panel h3,
	.dark .youtube-settings h3,
	.dark .shortcuts-panel h3,
	.dark .tips-panel h3 {
		color: #e2e8f0;
	}

	.settings-list,
	.tips-list {
		display: grid;
		gap: 0.6rem;
		margin-bottom: 1.25rem;
	}

	.setting-item {
		display: flex;
		gap: 0.75rem;
		padding: 0.7rem 0.9rem;
		background: oklch(0.97 0.01 var(--hue));
		border-radius: 0.5rem;
		border-left: 3px solid oklch(0.70 0.14 var(--hue));
	}

	:global(.dark) .setting-item,
	.dark .setting-item {
		background: oklch(0.20 0.02 var(--hue));
	}

	.setting-label {
		font-weight: 700;
		color: #0f172a;
		min-width: 110px;
	}

	:global(.dark) .setting-label,
	.dark .setting-label {
		color: #e2e8f0;
	}

	.setting-value {
		color: #475569;
		line-height: 1.4;
	}

	:global(.dark) .setting-value,
	.dark .setting-value {
		color: #94a3b8;
	}

	.btn-youtube-apply {
		width: 100%;
		background: linear-gradient(135deg, #ff0000, #cc0000);
		color: white;
		border: none;
		border-radius: 0.75rem;
		padding: 0.85rem 1.5rem;
		font-weight: 700;
		font-size: 1rem;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.3s ease;
		box-shadow: 0 8px 20px rgba(255, 0, 0, 0.3);
	}

	.btn-youtube-apply:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 28px rgba(255, 0, 0, 0.4);
	}

	.btn-youtube-apply:active {
		transform: translateY(0) scale(0.98);
	}

	.shortcuts-table {
		display: grid;
		gap: 0.4rem;
	}

	.shortcut-row {
		display: grid;
		grid-template-columns: minmax(140px, auto) 1fr;
		gap: 0.75rem;
		padding: 0.6rem 0.75rem;
		background: oklch(0.97 0.01 var(--hue));
		border-radius: 0.5rem;
		align-items: center;
	}

	:global(.dark) .shortcut-row,
	.dark .shortcut-row {
		background: oklch(0.20 0.02 var(--hue));
	}

	.shortcut-key {
		font-family: ui-monospace, "SF Mono", Monaco, "Courier New", monospace;
		font-weight: 700;
		color: oklch(0.60 0.14 var(--hue));
		background: oklch(0.94 0.01 var(--hue));
		padding: 0.3rem 0.6rem;
		border-radius: 0.375rem;
		font-size: 0.85rem;
		text-align: center;
	}

	:global(.dark) .shortcut-key,
	.dark .shortcut-key {
		background: oklch(0.25 0.02 var(--hue));
		color: oklch(0.70 0.14 var(--hue));
	}

	.shortcut-desc {
		color: #475569;
		font-size: 0.9rem;
	}

	:global(.dark) .shortcut-desc,
	.dark .shortcut-desc {
		color: #94a3b8;
	}

	.tip-item-pro {
		display: flex;
		gap: 0.85rem;
		padding: 0.85rem;
		background: oklch(0.97 0.01 var(--hue));
		border-radius: 0.75rem;
		border-left: 4px solid oklch(0.70 0.14 var(--hue));
	}

	:global(.dark) .tip-item-pro,
	.dark .tip-item-pro {
		background: oklch(0.20 0.02 var(--hue));
	}

	.tip-number {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 1.75rem;
		height: 1.75rem;
		background: oklch(0.70 0.14 var(--hue));
		color: white;
		border-radius: 50%;
		font-weight: 800;
		font-size: 0.9rem;
		flex-shrink: 0;
	}

	.tip-content strong {
		display: block;
		color: #0f172a;
		margin-bottom: 0.25rem;
		font-weight: 700;
		font-size: 0.95rem;
	}

	:global(.dark) .tip-content strong,
	.dark .tip-content strong {
		color: #e2e8f0;
	}

	.tip-content p {
		color: #64748b;
		line-height: 1.45;
		font-size: 0.9rem;
		margin: 0;
	}

	:global(.dark) .tip-content p,
	.dark .tip-content p {
		color: #94a3b8;
	}

	.btn-onboarding {
		background: linear-gradient(
			135deg,
			oklch(0.70 0.14 var(--hue)),
			oklch(0.65 0.16 calc(var(--hue) + 30))
		);
		color: white;
		border: none;
		border-radius: 0.75rem;
		padding: 0.85rem 2rem;
		font-weight: 700;
		font-size: 1rem;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.3s ease;
		box-shadow: 0 8px 20px oklch(0.70 0.14 var(--hue) / 0.35);
		justify-self: end;
	}

	.btn-onboarding:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 28px oklch(0.70 0.14 var(--hue) / 0.45);
	}

	.btn-onboarding:active {
		transform: translateY(0) scale(0.98);
	}

	/* ============================================
     Header
     ============================================ */
	.teleprompter-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.header-info {
		min-width: 0;
	}

	.teleprompter-title {
		font-size: 1.85rem;
		font-weight: 700;
		background: linear-gradient(
			135deg,
			oklch(0.70 0.14 var(--hue)),
			oklch(0.65 0.16 calc(var(--hue) + 30))
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-bottom: 0.2rem;
		line-height: 1.1;
	}

	.teleprompter-subtitle {
		color: #475569;
		font-size: 0.95rem;
		line-height: 1.4;
	}

	:global(.dark) .teleprompter-subtitle,
	.dark .teleprompter-subtitle {
		color: #94a3b8;
	}

	.status-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
		flex-wrap: wrap;
	}

	.status-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		transition: background-color 0.3s ease;
	}

	.status-indicator.playing {
		animation: pulse 1.6s ease-in-out infinite;
	}

	.teleprompter-status {
		color: #475569;
		font-size: 0.88rem;
		font-weight: 600;
	}

	:global(.dark) .teleprompter-status,
	.dark .teleprompter-status {
		color: #94a3b8;
	}

	.word-count {
		font-size: 0.85rem;
		color: #64748b;
	}

	:global(.dark) .word-count,
	.dark .word-count {
		color: #94a3b8;
	}

	.teleprompter-header-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.btn-help {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.9rem;
		background: oklch(0.95 0.02 var(--hue));
		color: oklch(0.50 0.12 var(--hue));
		border: 1px solid oklch(0.85 0.05 var(--hue));
		border-radius: 999px;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	:global(.dark) .btn-help,
	.dark .btn-help {
		background: oklch(0.30 0.03 var(--hue));
		color: oklch(0.75 0.14 var(--hue));
		border-color: oklch(0.40 0.05 var(--hue));
	}

	.btn-help:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px oklch(0.70 0.14 var(--hue) / 0.2);
	}

	.help-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: oklch(0.70 0.14 var(--hue));
		color: white;
		font-weight: 700;
		font-size: 0.8rem;
	}

	@media (max-width: 480px) {
		.help-badge {
			display: none;
		}
	}

	.btn-plain {
		padding: 0.5rem 0.9rem;
		background: transparent;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	:global(.dark) .btn-plain,
	.dark .btn-plain {
		color: #cbd5e1;
		border-color: #475569;
	}

	.btn-plain:hover {
		background: oklch(0.95 0.02 var(--hue));
		border-color: oklch(0.80 0.06 var(--hue));
		color: oklch(0.50 0.12 var(--hue));
	}

	:global(.dark) .btn-plain:hover,
	.dark .btn-plain:hover {
		background: oklch(0.25 0.03 var(--hue));
		border-color: oklch(0.45 0.08 var(--hue));
		color: oklch(0.75 0.14 var(--hue));
	}

	.btn-plain.active {
		background: oklch(0.92 0.04 var(--hue));
		border-color: oklch(0.75 0.10 var(--hue));
		color: oklch(0.55 0.14 var(--hue));
	}

	:global(.dark) .btn-plain.active,
	.dark .btn-plain.active {
		background: oklch(0.28 0.04 var(--hue));
		border-color: oklch(0.50 0.10 var(--hue));
		color: oklch(0.75 0.14 var(--hue));
	}

	@media (max-width: 640px) {
		.btn-plain {
			font-size: 0.8rem;
			padding: 0.45rem 0.7rem;
		}
	}

	/* ============================================
     Mobile tip banner
     ============================================ */
	.mobile-tip-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.6rem 0.9rem;
		background: oklch(0.94 0.03 var(--hue));
		border: 1px solid oklch(0.88 0.05 var(--hue));
		border-radius: 0.75rem;
		font-size: 0.8rem;
		line-height: 1.4;
		color: oklch(0.40 0.08 var(--hue));
		animation: fadeIn 0.4s ease;
	}

	:global(.dark) .mobile-tip-banner,
	.dark .mobile-tip-banner {
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

	.mobile-tip-icon {
		font-size: 1rem;
		flex-shrink: 0;
		line-height: 1.3;
	}

	.mobile-tip-content p {
		margin: 0;
		font-size: inherit;
		line-height: inherit;
	}

	.mobile-tip-content strong {
		color: oklch(0.50 0.12 var(--hue));
		font-weight: 600;
	}

	:global(.dark) .mobile-tip-content strong,
	.dark .mobile-tip-content strong {
		color: oklch(0.72 0.12 var(--hue));
	}

	.mobile-tip-close {
		background: none;
		border: none;
		color: oklch(0.55 0.05 var(--hue));
		font-size: 0.9rem;
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

	:global(.dark) .mobile-tip-close,
	.dark .mobile-tip-close {
		color: oklch(0.60 0.05 var(--hue));
	}

	:global(.dark) .mobile-tip-close:hover,
	.dark .mobile-tip-close:hover {
		background: oklch(0.30 0.04 var(--hue));
		color: oklch(0.80 0.06 var(--hue));
	}

	/* ============================================
     Panel
     ============================================ */
	.teleprompter-panel {
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-radius: 1.25rem;
		padding: 1.25rem;
		border: 1px solid rgba(0, 0, 0, 0.08);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
		display: grid;
		gap: 1rem;
	}

	:global(.dark) .teleprompter-panel,
	.dark .teleprompter-panel {
		background: rgba(30, 41, 59, 0.8);
		border-color: rgba(148, 163, 184, 0.15);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
	}

	.script-manager {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.manager-label {
		font-weight: 600;
		font-size: 0.85rem;
		color: #334155;
	}

	:global(.dark) .manager-label,
	.dark .manager-label {
		color: #cbd5e1;
	}

	.script-controls {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.script-controls select {
		flex: 1;
		min-width: 200px;
		padding: 0.55rem 0.9rem;
		background: white;
		color: #0f172a;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	:global(.dark) .script-controls select,
	.dark .script-controls select {
		background: #1e293b;
		color: #e2e8f0;
		border-color: #475569;
	}

	.script-controls select:hover {
		border-color: oklch(0.70 0.14 var(--hue));
	}

	.script-controls select:focus {
		outline: none;
		border-color: oklch(0.70 0.14 var(--hue));
		box-shadow: 0 0 0 3px oklch(0.70 0.14 var(--hue) / 0.1);
	}

	.btn-icon {
		padding: 0.55rem 0.85rem;
		background: oklch(0.95 0.02 var(--hue));
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	:global(.dark) .btn-icon,
	.dark .btn-icon {
		background: oklch(0.25 0.03 var(--hue));
		border-color: #475569;
	}

	.btn-icon:hover {
		transform: translateY(-1px);
		background: oklch(0.70 0.14 var(--hue));
		border-color: oklch(0.70 0.14 var(--hue));
		box-shadow: 0 4px 12px oklch(0.70 0.14 var(--hue) / 0.2);
	}

	.teleprompter-input {
		width: 100%;
		min-height: 110px;
		padding: 0.9rem;
		background: white;
		color: #0f172a;
		border: 1px solid #cbd5e1;
		border-radius: 0.75rem;
		font-family: inherit;
		font-size: 0.95rem;
		line-height: 1.5;
		resize: vertical;
		transition: all 0.2s ease;
	}

	:global(.dark) .teleprompter-input,
	.dark .teleprompter-input {
		background: #1e293b;
		color: #e2e8f0;
		border-color: #475569;
	}

	.teleprompter-input::placeholder {
		color: #94a3b8;
	}

	:global(.dark) .teleprompter-input::placeholder,
	.dark .teleprompter-input::placeholder {
		color: #64748b;
	}

	.teleprompter-input:focus {
		outline: none;
		border-color: oklch(0.70 0.14 var(--hue));
		box-shadow: 0 0 0 3px oklch(0.70 0.14 var(--hue) / 0.1);
	}

	/* ============================================
     Controls
     ============================================ */
	.teleprompter-controls {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.controls-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
	}

	.control-group {
		background: rgba(255, 255, 255, 0.5);
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 0.75rem;
		padding: 0.9rem;
		transition: all 0.2s ease;
	}

	:global(.dark) .control-group,
	.dark .control-group {
		background: rgba(15, 23, 42, 0.4);
		border-color: rgba(148, 163, 184, 0.1);
	}

	.control-group:hover {
		background: rgba(255, 255, 255, 0.8);
		border-color: oklch(0.85 0.06 var(--hue));
	}

	:global(.dark) .control-group:hover,
	.dark .control-group:hover {
		background: rgba(15, 23, 42, 0.6);
		border-color: oklch(0.45 0.08 var(--hue));
	}

	.control-label-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.6rem;
		gap: 0.5rem;
	}

	.control-group > label,
	.control-label-row > label {
		font-weight: 600;
		font-size: 0.85rem;
		color: #334155;
	}

	:global(.dark) .control-group > label,
	:global(.dark) .control-label-row > label,
	.dark .control-group > label,
	.dark .control-label-row > label {
		color: #cbd5e1;
	}

	.speed-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: oklch(0.60 0.12 var(--hue));
		padding: 0.15rem 0.5rem;
		background: oklch(0.95 0.03 var(--hue));
		border-radius: 999px;
		white-space: nowrap;
	}

	:global(.dark) .speed-label,
	.dark .speed-label {
		color: oklch(0.75 0.14 var(--hue));
		background: oklch(0.25 0.04 var(--hue));
	}

	.control-value-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.5rem;
		gap: 0.5rem;
	}

	.control-value {
		font-size: 0.85rem;
		font-weight: 600;
		color: #475569;
	}

	:global(.dark) .control-value,
	.dark .control-value {
		color: #94a3b8;
	}

	.speed-indicator-bar {
		height: 4px;
		border-radius: 999px;
		transition: all 0.3s ease;
		max-width: 60px;
		flex: 1;
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

	:global(.dark) .custom-range,
	.dark .custom-range {
		background: linear-gradient(to right, #475569 0%, #475569 100%);
	}

	.custom-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: oklch(0.70 0.14 var(--hue));
		cursor: pointer;
		border: 3px solid white;
		box-shadow: 0 2px 8px oklch(0.70 0.14 var(--hue) / 0.3);
		transition: all 0.2s ease;
	}

	:global(.dark) .custom-range::-webkit-slider-thumb,
	.dark .custom-range::-webkit-slider-thumb {
		border-color: #1e293b;
	}

	.custom-range::-webkit-slider-thumb:hover {
		transform: scale(1.15);
		box-shadow: 0 4px 12px oklch(0.70 0.14 var(--hue) / 0.4);
	}

	.custom-range::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: oklch(0.70 0.14 var(--hue));
		cursor: pointer;
		border: 3px solid white;
		box-shadow: 0 2px 8px oklch(0.70 0.14 var(--hue) / 0.3);
		transition: all 0.2s ease;
	}

	:global(.dark) .custom-range::-moz-range-thumb,
	.dark .custom-range::-moz-range-thumb {
		border-color: #1e293b;
	}

	.custom-range::-moz-range-thumb:hover {
		transform: scale(1.15);
		box-shadow: 0 4px 12px oklch(0.70 0.14 var(--hue) / 0.4);
	}

	.countdown-select {
		width: 100%;
		padding: 0.55rem 0.9rem;
		background: white;
		color: #0f172a;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	:global(.dark) .countdown-select,
	.dark .countdown-select {
		background: #1e293b;
		color: #e2e8f0;
		border-color: #475569;
	}

	.countdown-select:hover {
		border-color: oklch(0.70 0.14 var(--hue));
	}

	.countdown-select:focus {
		outline: none;
		border-color: oklch(0.70 0.14 var(--hue));
		box-shadow: 0 0 0 3px oklch(0.70 0.14 var(--hue) / 0.1);
	}

	/* Toggles */
	.control-group.toggles {
		grid-column: 1 / -1;
	}

	.toggle-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
		gap: 0.6rem;
		margin-top: 0.5rem;
	}

	.toggle-btn {
		padding: 0.6rem 0.9rem;
		background: white;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 999px;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: center;
	}

	:global(.dark) .toggle-btn,
	.dark .toggle-btn {
		background: #1e293b;
		color: #cbd5e1;
		border-color: #475569;
	}

	.toggle-btn:hover {
		transform: translateY(-1px);
		border-color: oklch(0.70 0.14 var(--hue));
		box-shadow: 0 4px 12px oklch(0.70 0.14 var(--hue) / 0.15);
	}

	.toggle-btn.active {
		background: oklch(0.70 0.14 var(--hue));
		color: white;
		border-color: oklch(0.70 0.14 var(--hue));
		box-shadow: 0 4px 12px oklch(0.70 0.14 var(--hue) / 0.3);
	}

	:global(.dark) .toggle-btn.active,
	.dark .toggle-btn.active {
		background: oklch(0.60 0.14 var(--hue));
		color: white;
		border-color: oklch(0.60 0.14 var(--hue));
	}

	.toggle-btn.active:hover {
		background: oklch(0.65 0.16 var(--hue));
	}

	/* Action buttons */
	.control-actions {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.btn-play {
		flex: 1;
		min-width: 160px;
		padding: 0.9rem 1.25rem;
		background: linear-gradient(
			135deg,
			oklch(0.70 0.14 var(--hue)),
			oklch(0.65 0.16 calc(var(--hue) + 30))
		);
		color: white;
		border: none;
		border-radius: 0.75rem;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 16px oklch(0.70 0.14 var(--hue) / 0.3);
	}

	.btn-play:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px oklch(0.70 0.14 var(--hue) / 0.4);
	}

	.btn-play:active {
		transform: translateY(0);
	}

	.btn-action {
		padding: 0.7rem 1.1rem;
		background: white;
		color: #475569;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	:global(.dark) .btn-action,
	.dark .btn-action {
		background: #1e293b;
		color: #cbd5e1;
		border-color: #475569;
	}

	.btn-action:hover {
		background: oklch(0.95 0.02 var(--hue));
		border-color: oklch(0.80 0.06 var(--hue));
		color: oklch(0.50 0.12 var(--hue));
		transform: translateY(-1px);
	}

	:global(.dark) .btn-action:hover,
	.dark .btn-action:hover {
		background: oklch(0.25 0.03 var(--hue));
		border-color: oklch(0.45 0.08 var(--hue));
		color: oklch(0.75 0.14 var(--hue));
	}

	/* ============================================
     Screen
     ============================================ */
	.teleprompter-screen {
		position: relative;
		background: linear-gradient(135deg, #f8fafc, #f1f5f9);
		border-radius: 1.25rem;
		overflow: hidden;
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.08),
			inset 0 0 0 1px rgba(255, 255, 255, 0.5);
		height: 65vh;
		min-height: 480px;
		transition: all 0.3s ease;
	}

	:global(.dark) .teleprompter-screen,
	.dark .teleprompter-screen {
		background: linear-gradient(135deg, #0f172a, #1e293b);
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.5),
			inset 0 0 0 1px rgba(148, 163, 184, 0.1);
	}

	@media (max-width: 768px) {
		.teleprompter-screen {
			min-height: 340px;
			height: 60vh;
		}
	}

	.teleprompter-screen.glow::before {
		content: "";
		position: absolute;
		inset: -2px;
		background: linear-gradient(135deg, oklch(0.75 0.14 var(--hue)), oklch(0.70 0.16 calc(var(--hue) + 60)));
		border-radius: inherit;
		opacity: 0.3;
		z-index: -1;
		filter: blur(20px);
		animation: glowPulse 3s ease-in-out infinite;
	}

	.teleprompter-screen.is-fullscreen {
		border-radius: 0;
		height: 100vh;
		min-height: 100vh;
	}

	.teleprompter-screen.mirror {
		transform: scaleX(-1);
	}

	/* Progress bar */
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

	:global(.dark) .teleprompter-progress-top,
	.dark .teleprompter-progress-top {
		background: rgba(255, 255, 255, 0.1);
	}

	.progress-bar {
		height: 100%;
		background: linear-gradient(90deg, oklch(0.70 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 60)));
		transition: width 0.2s linear;
		box-shadow: 0 0 10px oklch(0.70 0.14 var(--hue) / 0.5);
	}

	.time-remaining {
		position: absolute;
		top: 0.7rem;
		right: 1rem;
		padding: 0.3rem 0.7rem;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		font-size: 0.8rem;
		font-weight: 600;
		border-radius: 999px;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		z-index: 11;
	}

	/* Reading marker */
	.reading-position-marker {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 2px;
		background: oklch(0.70 0.14 var(--hue) / 0.3);
		z-index: 5;
		pointer-events: none;
		box-shadow: 0 0 20px oklch(0.70 0.14 var(--hue) / 0.4);
	}

	.teleprompter-screen.focus .reading-position-marker {
		background: oklch(0.70 0.14 var(--hue) / 0.5);
		box-shadow: 0 0 30px oklch(0.70 0.14 var(--hue) / 0.6);
	}

	/* Frame */
	.teleprompter-frame {
		height: 100%;
		overflow-y: auto;
		overflow-x: hidden;
		scroll-behavior: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
	}

	:global(.dark) .teleprompter-frame,
	.dark .teleprompter-frame {
		scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
	}

	.teleprompter-frame::-webkit-scrollbar {
		width: 8px;
	}

	.teleprompter-frame::-webkit-scrollbar-track {
		background: transparent;
	}

	.teleprompter-frame::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.3);
		border-radius: 999px;
	}

	:global(.dark) .teleprompter-frame::-webkit-scrollbar-thumb,
	.dark .teleprompter-frame::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.3);
	}

	.teleprompter-frame::-webkit-scrollbar-thumb:hover {
		background: rgba(0, 0, 0, 0.5);
	}

	:global(.dark) .teleprompter-frame::-webkit-scrollbar-thumb:hover,
	.dark .teleprompter-frame::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.5);
	}

	/* Content */
	.teleprompter-content {
		color: #0f172a;
		text-align: center;
		user-select: none;
		-webkit-user-select: none;
	}

	:global(.dark) .teleprompter-content,
	.dark .teleprompter-content {
		color: #f1f5f9;
	}

	.teleprompter-content p {
		margin: 0.75rem 0;
		padding: 0.5rem 1rem;
		transition:
			opacity 0.3s ease,
			background 0.2s ease,
			transform 0.2s ease;
		border-radius: 0.5rem;
		line-height: inherit;
		min-height: 1em;
	}

	.teleprompter-content p.active {
		background: rgba(0, 0, 0, 0.04);
		border-left: 4px solid oklch(0.70 0.14 var(--hue));
		padding-left: calc(1rem - 4px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .teleprompter-content p.active,
	.dark .teleprompter-content p.active {
		background: rgba(255, 255, 255, 0.06);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.teleprompter-content p.dimmed {
		opacity: 0.3;
	}

	/* Dim overlay */
	.teleprompter-dim {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at center, transparent 20%, rgba(0, 0, 0, 0.6) 70%);
		pointer-events: none;
		z-index: 4;
	}

	:global(.dark) .teleprompter-dim,
	.dark .teleprompter-dim {
		background: radial-gradient(ellipse at center, transparent 20%, rgba(0, 0, 0, 0.85) 70%);
	}

	/* Floating controls */
	.teleprompter-float {
		position: absolute;
		bottom: 1.25rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 0.4rem;
		align-items: center;
		padding: 0.5rem;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: 999px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
		z-index: 20;
		transition: all 0.3s ease;
		opacity: 0.7;
	}

	.teleprompter-float:hover {
		opacity: 1;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
	}

	.btn-float {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.15);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.btn-float:hover {
		background: oklch(0.70 0.14 var(--hue));
		border-color: oklch(0.70 0.14 var(--hue));
		transform: translateY(-2px) scale(1.05);
		box-shadow: 0 4px 12px oklch(0.70 0.14 var(--hue) / 0.4);
	}

	.btn-float-primary {
		width: 48px;
		height: 48px;
		font-size: 1.2rem;
		background: oklch(0.70 0.14 var(--hue));
		border-color: oklch(0.70 0.14 var(--hue));
	}

	.btn-float-primary:hover {
		background: oklch(0.65 0.16 var(--hue));
	}

	.btn-float-primary.playing {
		background: oklch(0.60 0.18 25);
		border-color: oklch(0.60 0.18 25);
	}

	.float-speed-control {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0 0.4rem;
	}

	.mini-range {
		width: 90px;
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
		font-size: 0.8rem;
		font-weight: 600;
		min-width: 30px;
	}

	/* Footer */
	.teleprompter-footer {
		position: absolute;
		bottom: 0.75rem;
		left: 1rem;
		right: 1rem;
		text-align: center;
		z-index: 1;
		opacity: 0.5;
		transition: opacity 0.3s ease;
		pointer-events: none;
	}

	.teleprompter-footer:hover {
		opacity: 0.9;
	}

	.shortcut {
		font-size: 0.72rem;
		color: #64748b;
		font-weight: 500;
	}

	:global(.dark) .shortcut,
	.dark .shortcut {
		color: #94a3b8;
	}

	.teleprompter-screen.is-fullscreen .teleprompter-footer {
		bottom: 4.5rem;
	}

	/* Countdown */
	.teleprompter-countdown {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
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

	/* ============================================
     Animations
     ============================================ */
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
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.5;
			transform: scale(1.1);
		}
	}

	@keyframes glowPulse {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 0.5;
		}
	}

	@keyframes countdownPulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.15);
		}
	}

	/* ============================================
     Responsive
     ============================================ */
	@media (max-width: 768px) {
		.teleprompter-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.controls-grid {
			grid-template-columns: 1fr;
		}

		.toggle-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.control-actions {
			flex-direction: column;
		}

		.btn-play,
		.btn-action {
			width: 100%;
		}

		.teleprompter-float {
			bottom: 0.85rem;
			padding: 0.4rem;
			gap: 0.3rem;
		}

		.btn-float {
			width: 42px;
			height: 42px;
		}

		.btn-float-primary {
			width: 50px;
			height: 50px;
		}

		.teleprompter-countdown span {
			font-size: 5rem;
		}
	}

	@media (orientation: landscape) and (max-height: 500px) {
		.teleprompter-screen {
			height: 85vh;
			min-height: unset;
		}

		.teleprompter-header {
			flex-direction: row;
			gap: 0.5rem;
		}

		.teleprompter-panel {
			padding: 0.85rem;
		}

		.teleprompter-float {
			bottom: 0.4rem;
			padding: 0.35rem;
		}

		.btn-float {
			width: 36px;
			height: 36px;
			font-size: 0.9rem;
		}

		.btn-float-primary {
			width: 42px;
			height: 42px;
		}

		.teleprompter-footer {
			display: none;
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
