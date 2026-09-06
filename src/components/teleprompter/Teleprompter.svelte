<script lang="ts">
	import {
		applyStoredThemeToDocument,
		getStoredTheme,
		watchSystemThemeChanges,
	} from "@utils/setting-utils.ts";
	import { onDestroy, onMount } from "svelte";

	// =========================================================================
	// CONSTANTES Y GEOMETRÍA ÓPTICA
	// =========================================================================
	const STORAGE_KEY_STATE = "teleprompter:state:v6";
	const STORAGE_KEY_SCRIPTS = "teleprompter:scripts";
	const STORAGE_KEY_LAST_SCRIPT = "teleprompter:lastScript";
	const STORAGE_KEY_ONBOARDING = "teleprompter:onboarding:done";

	const SPEED_MIN = 10;
	const SPEED_MAX = 400;
	const WORDS_PER_MINUTE = 150;
	const TAP_THRESHOLD_MS = 300;
	const SWIPE_THRESHOLD_PX = 30;
	const JUMP_SHORT_PX = 120;
	const JUMP_LONG_PX = 320;
	const JUMP_ACTION_PX = 240;

	// Eje óptico de lectura fijado en el 45% del viewport
	const READING_LINE_RATIO = 0.45;

	// =========================================================================
	// TIPOS EXPLÍCITOS
	// =========================================================================
	interface SavedScript {
		id: string;
		name: string;
		text: string;
		createdAt: string;
		updatedAt: string;
	}

	interface TeleprompterPersistedState {
		text: string;
		speed: number;
		fontSize: number;
		lineHeight: number;
		isMirror: boolean;
		autoCenter: boolean;
		smooth: boolean;
		glow: boolean;
		focusMode: boolean;
		dimOutside: boolean;
		countdownDuration: number;
	}

	interface LineMetric {
		center: number;
	}

	// =========================================================================
	// ESTADO REACTIVO
	// =========================================================================
	let text = `Pega aquí tu guion...\n\nTip: Usa párrafos cortos para una lectura más cómoda.`;
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
	let isPseudoFullscreen = false;
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
	let isDark = false;

	// Coordenadas calculadas en frío (px)
	let topPaddingPx = 250;
	let bottomPaddingPx = 300;

	// =========================================================================
	// REFS DIRECTAS A ELEMENTOS DEL DOM
	// =========================================================================
	let scrollContainer: HTMLDivElement | null = null;
	let content: HTMLDivElement | null = null;
	let progressBarElement: HTMLDivElement | null = null;
	let timeRemainingElement: HTMLDivElement | null = null;
	let fullscreenTarget: HTMLDivElement | null = null;
	let lineElements: Array<HTMLParagraphElement | null> = [];

	let rafId: number | null = null;
	let lastFrameTimestamp: number | null = null;
	let lastLowFreqSyncTimestamp = 0;
	let countdownTimer: ReturnType<typeof setInterval> | null = null;
	let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let stopThemeWatch: (() => void) | null = null;
	let darkModeObserver: MutationObserver | null = null;
	let resizeObserver: ResizeObserver | null = null;

	let lines: string[] = [];
	let lineMetrics: LineMetric[] = [];
	let scripts: SavedScript[] = [];

	let currentSpeed = 0;
	let cachedMaxScroll = 0;
	let scrollAccumulator = 0;
	let touchStartY = 0;
	let lastTapTimestamp = 0;
	let isFormatting = false;
	let activeLineIndex = 0;

	// =========================================================================
	// REACTIVIDAD DERIVADA
	// =========================================================================
	$: lines = text.split("\n");
	$: if (lineElements.length !== lines.length) {
		lineElements = lines.map((_, i) => lineElements[i] || null);
	}

	$: wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
	$: estimatedMinutes = wordCount > 0 ? Math.floor(wordCount / WORDS_PER_MINUTE) : 0;
	$: estimatedSeconds = wordCount > 0 ? Math.ceil((wordCount / WORDS_PER_MINUTE) * 60) % 60 : 0;
	$: readingTimeLabel =
		wordCount > 0
			? estimatedMinutes > 0
				? `~${estimatedMinutes}m ${estimatedSeconds}s`
				: `~${estimatedSeconds}s`
			: "";

	// =========================================================================
	// UTILIDADES DE STORAGE SEGURO
	// =========================================================================
	const clamp = (value: number, min: number, max: number): number =>
		Math.min(Math.max(value, min), max);

	const safeStorage = {
		get(key: string): string | null {
			try {
				return typeof window !== "undefined" ? localStorage.getItem(key) : null;
			} catch {
				return null;
			}
		},
		set(key: string, value: string): boolean {
			try {
				if (typeof window === "undefined") return false;
				localStorage.setItem(key, value);
				return true;
			} catch {
				return false;
			}
		},
		remove(key: string): void {
			try {
				if (typeof window !== "undefined") localStorage.removeItem(key);
			} catch {}
		}
	};

	// =========================================================================
	// CONTROL ATÓMICO DEL MODO ESPEJO
	// =========================================================================
	const toggleMirror = (forceState?: boolean): void => {
		isMirror = typeof forceState === "boolean" ? forceState : !isMirror;
		applyMirrorToDOM();
		scheduleSave();
	};

	const applyMirrorToDOM = (): void => {
		if (!content) return;
		const transformValue = isMirror ? "scaleX(-1) translateZ(0)" : "translateZ(0)";
		content.style.setProperty("transform", transformValue, "important");
		content.style.setProperty("-webkit-transform", transformValue, "important");
		content.style.setProperty("transform-origin", "center center", "important");
		content.classList.toggle("mirror", isMirror);
	};

	// =========================================================================
	// CONTROLADORES DE MODOS
	// =========================================================================
	const toggleDimOutside = (): void => {
		dimOutside = !dimOutside;
		scheduleSave();
	};

	const toggleGlow = (): void => {
		glow = !glow;
		scheduleSave();
	};

	const toggleFocusMode = (): void => {
		focusMode = !focusMode;
		setTimeout(calculateMetrics, 50);
		scheduleSave();
	};

	const toggleAutoCenter = (): void => {
		const prevMax = cachedMaxScroll;
		const ratio = prevMax > 0 ? scrollAccumulator / prevMax : 0;
		autoCenter = !autoCenter;
		setTimeout(() => {
			calculateMetrics();
			if (cachedMaxScroll > 0) {
				const targetScroll = ratio * cachedMaxScroll;
				scrollAccumulator = targetScroll;
				if (scrollContainer) scrollContainer.scrollTop = targetScroll;
				syncUiDirect(targetScroll);
			}
			scheduleSave();
		}, 60);
	};

	const toggleSmooth = (): void => {
		smooth = !smooth;
		scheduleSave();
	};

	// =========================================================================
	// AUTO-ORGANIZADOR DE GUIONES
	// =========================================================================
	const autoFormatScript = (): void => {
		if (!text.trim() || isFormatting) return;
		isFormatting = true;

		const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/[ \t]+/g, " ");
		const rawParagraphs = cleanText.split(/\n\s*\n/);
		const structuredParagraphs: string[] = [];

		for (const paragraph of rawParagraphs) {
			const trimmed = paragraph.trim();
			if (!trimmed) continue;

			const rawLines = trimmed.split("\n");
			let joined = "";

			for (const rLine of rawLines) {
				const singleLine = rLine.trim();
				if (!singleLine) continue;

				if (joined && !joined.endsWith("\n") && !/^[-*•\d+.]\s/.test(singleLine)) {
					joined += ` ${singleLine}`;
				} else {
					joined += (joined ? "\n" : "") + singleLine;
				}
			}

			if (joined.length > 130 && !joined.includes("\n")) {
				const sentences = joined.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [joined];
				let chunk = "";

				for (const s of sentences) {
					const sTrim = s.trim();
					if (!sTrim) continue;

					if (!chunk) {
						chunk = sTrim;
					} else if ((chunk + " " + sTrim).length <= 150) {
						chunk += ` ${sTrim}`;
					} else {
						structuredParagraphs.push(chunk);
						chunk = sTrim;
					}
				}

				if (chunk) structuredParagraphs.push(chunk);
			} else {
				structuredParagraphs.push(joined);
			}
		}

		text = structuredParagraphs.join("\n\n");
		setTimeout(() => {
			calculateMetrics();
			isFormatting = false;
		}, 80);
	};

	const handlePaste = (e: ClipboardEvent): void => {
		const pasted = e.clipboardData?.getData("text");
		if (pasted && pasted.length > 250) {
			if (pasted.split("\n").some((l) => l.length > 160)) {
				setTimeout(autoFormatScript, 60);
			}
		}
	};

	// =========================================================================
	// CÁLCULO FÍSICO DE LÍMITES Y LÍNEA ÓPTICA (SIN SALTO AL VACÍO)
	// =========================================================================
	const calculateMetrics = (): void => {
		if (!scrollContainer || !content) return;

		const viewportHeight = scrollContainer.clientHeight;
		if (viewportHeight <= 0) return;

		const firstEl = lineElements.find((el) => el !== null);
		const lastEl = [...lineElements].reverse().find((el) => el !== null);

		const hFirst = firstEl ? firstEl.offsetHeight : fontSize * lineHeight;
		const hLast = lastEl ? lastEl.offsetHeight : fontSize * lineHeight;

		const opticalCenter = viewportHeight * READING_LINE_RATIO;

		// Alineación geométrica exacta: primer párrafo al 45% y último párrafo detenido al 45%
		topPaddingPx = Math.max(0, Math.round(opticalCenter - hFirst / 2));
		bottomPaddingPx = Math.max(0, Math.round(viewportHeight * (1 - READING_LINE_RATIO) - hLast / 2));

		// Cálculo analítico estricto del scroll máximo
		const totalScrollHeight = topPaddingPx + content.offsetHeight + bottomPaddingPx;
		cachedMaxScroll = Math.max(totalScrollHeight - viewportHeight, 0);

		// Matriz de centros absolutos congruente con topPaddingPx
		lineMetrics = lineElements.map((el) => {
			if (!el) return { center: 0 };
			return { center: topPaddingPx + el.offsetTop + el.offsetHeight / 2 };
		});

		syncUiDirect(scrollContainer.scrollTop);
	};

	const updateActiveLineFromMemory = (currentScrollTop: number): void => {
		if (!scrollContainer || lineMetrics.length === 0 || !focusMode) return;

		const viewportHeight = scrollContainer.clientHeight;
		const currentReadingTargetY = currentScrollTop + (viewportHeight * READING_LINE_RATIO);

		let closestIndex = 0;
		let minDistance = Number.POSITIVE_INFINITY;

		for (let i = 0; i < lineMetrics.length; i++) {
			const distance = Math.abs(lineMetrics[i].center - currentReadingTargetY);
			if (distance < minDistance) {
				minDistance = distance;
				closestIndex = i;
			}
		}

		if (activeLineIndex !== closestIndex) {
			activeLineIndex = closestIndex;
		}
	};

	// Sincronización directa en hardware (Zero Layout Thrashing, Zero Svelte Diffing)
	const syncUiDirect = (scrollTop: number): void => {
		if (cachedMaxScroll <= 0) {
			progress = 0;
			if (progressBarElement) progressBarElement.style.transform = "scaleX(0)";
			if (timeRemainingElement) timeRemainingElement.textContent = "0s";
			activeLineIndex = 0;
			return;
		}

		const currentRatio = clamp(scrollTop / cachedMaxScroll, 0, 1);

		if (progressBarElement) {
			progressBarElement.style.transform = `scaleX(${currentRatio})`;
		}

		if (timeRemainingElement && speed > 0) {
			const remainingPx = cachedMaxScroll - scrollTop;
			if (remainingPx <= 0) {
				timeRemainingElement.textContent = "0s";
			} else {
				const sec = Math.ceil(remainingPx / speed);
				timeRemainingElement.textContent =
					sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;
			}
		}

		updateActiveLineFromMemory(scrollTop);
	};

	const handleScroll = (): void => {
		if (!isPlaying && scrollContainer) {
			scrollAccumulator = scrollContainer.scrollTop;
			syncUiDirect(scrollAccumulator);
			progress = cachedMaxScroll > 0 ? clamp(scrollAccumulator / cachedMaxScroll, 0, 1) : 0;
		}
	};

	const resetScrollToStart = (): void => {
		if (!scrollContainer) return;
		scrollContainer.scrollTop = 0;
		scrollAccumulator = 0;
		progress = 0;
		activeLineIndex = 0;
		syncUiDirect(0);
	};

	// =========================================================================
	// MOTOR DE DESPLAZAMIENTO ULTRA FLUIDO (60/120 FPS NATIVO)
	// =========================================================================
	const tick = (timestamp: number): void => {
		if (!isPlaying || !scrollContainer) {
			rafId = null;
			lastFrameTimestamp = null;
			return;
		}

		if (lastFrameTimestamp === null) {
			lastFrameTimestamp = timestamp;
			lastLowFreqSyncTimestamp = timestamp;
			scrollAccumulator = scrollContainer.scrollTop;
			rafId = requestAnimationFrame(tick);
			return;
		}

		const elapsedSeconds = Math.min((timestamp - lastFrameTimestamp) / 1000, 0.05);
		lastFrameTimestamp = timestamp;

		if (smooth) {
			const smoothingFactor = 1 - Math.exp(-elapsedSeconds * 12);
			currentSpeed += (speed - currentSpeed) * smoothingFactor;
		} else {
			currentSpeed = speed;
		}

		if (Math.abs(currentSpeed - speed) < 0.1) {
			currentSpeed = speed;
		}

		scrollAccumulator += currentSpeed * elapsedSeconds;

		// Condición de parada exacta: último párrafo descansando en la línea de lectura
		if (scrollAccumulator >= cachedMaxScroll) {
			scrollContainer.scrollTop = cachedMaxScroll;
			scrollAccumulator = cachedMaxScroll;
			isPlaying = false;
			rafId = null;
			lastFrameTimestamp = null;
			progress = 1;
			if (progressBarElement) progressBarElement.style.transform = "scaleX(1)";
			if (timeRemainingElement) timeRemainingElement.textContent = "0s";
			updateActiveLineFromMemory(cachedMaxScroll);
			return;
		}

		// Asignación de desplazamiento directo en hardware
		scrollContainer.scrollTop = scrollAccumulator;
		syncUiDirect(scrollAccumulator);

		// Sincronización de baja frecuencia hacia Svelte (4 Hz) para labels de UI sin saturar el Main Thread
		if (timestamp - lastLowFreqSyncTimestamp > 250) {
			lastLowFreqSyncTimestamp = timestamp;
			progress = cachedMaxScroll > 0 ? clamp(scrollAccumulator / cachedMaxScroll, 0, 1) : 0;
		}

		rafId = requestAnimationFrame(tick);
	};

	const startPlayback = (): void => {
		if (!scrollContainer || !content) return;
		if (rafId !== null) cancelAnimationFrame(rafId);

		calculateMetrics();
		if (cachedMaxScroll <= 0) return;

		// Si terminó, reinicia desde el origen exacto (carácter cero)
		if (progress >= 0.999) {
			resetScrollToStart();
		} else {
			scrollAccumulator = scrollContainer.scrollTop;
		}

		isPlaying = true;
		lastFrameTimestamp = null;
		lastLowFreqSyncTimestamp = performance.now();
		rafId = requestAnimationFrame(tick);
	};

	const cancelCountdown = (): void => {
		if (countdownTimer !== null) {
			clearInterval(countdownTimer);
			countdownTimer = null;
		}
		countdown = 0;
		isCountingDown = false;
	};

	const beginCountdown = (): void => {
		if (isCountingDown) return;

		if (progress >= 0.999) {
			resetScrollToStart();
		}

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

	const start = (): void => {
		if (isPlaying || isCountingDown) return;
		beginCountdown();
	};

	const pause = (): void => {
		isPlaying = false;
		cancelCountdown();

		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}

		lastFrameTimestamp = null;
		currentSpeed = speed;

		if (scrollContainer) {
			scrollAccumulator = scrollContainer.scrollTop;
			syncUiDirect(scrollAccumulator);
			progress = cachedMaxScroll > 0 ? clamp(scrollAccumulator / cachedMaxScroll, 0, 1) : 0;
		}
	};

	const toggle = (): void => {
		if (isPlaying) {
			pause();
		} else if (isCountingDown) {
			cancelCountdown();
		} else {
			start();
		}
	};

	const reset = (): void => {
		pause();
		resetScrollToStart();
	};

	const clearText = (): void => {
		pause();
		text = "";
		resetScrollToStart();
		scheduleSave();
	};

	const jump = (pixels: number): void => {
		if (!scrollContainer) return;
		const targetPosition = clamp(scrollContainer.scrollTop + pixels, 0, cachedMaxScroll);
		scrollContainer.scrollTop = targetPosition;
		scrollAccumulator = targetPosition;
		syncUiDirect(targetPosition);
		progress = cachedMaxScroll > 0 ? clamp(targetPosition / cachedMaxScroll, 0, 1) : 0;
	};

	const scrollToProgressRatio = (ratio: number): void => {
		if (!scrollContainer) return;
		const targetPosition = clamp(ratio, 0, 1) * cachedMaxScroll;
		scrollContainer.scrollTop = targetPosition;
		scrollAccumulator = targetPosition;
		syncUiDirect(targetPosition);
		progress = ratio;
	};

	// =========================================================================
	// CONTROL SEGURO DE FULLSCREEN (CONSERVACIÓN ESTRICTA DE POSICIÓN)
	// =========================================================================
	const toggleFullscreen = async (): Promise<void> => {
		if (!fullscreenTarget) return;

		// Capturar la posición fraccional antes del redimensionamiento del viewport
		const previousRatio = cachedMaxScroll > 0 ? scrollAccumulator / cachedMaxScroll : 0;

		const doc = document as Document & {
			webkitFullscreenElement?: Element;
			webkitExitFullscreen?: () => Promise<void>;
		};
		const target = fullscreenTarget as HTMLDivElement & {
			webkitRequestFullscreen?: () => Promise<void>;
		};

		const isNativeFullscreen = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);

		if (target.requestFullscreen) {
			try {
				if (!isNativeFullscreen) {
					await target.requestFullscreen();
				} else {
					await doc.exitFullscreen();
				}
				return;
			} catch {}
		} else if (target.webkitRequestFullscreen) {
			try {
				if (!isNativeFullscreen) {
					await target.webkitRequestFullscreen();
				} else if (doc.webkitExitFullscreen) {
					await doc.webkitExitFullscreen();
				}
				return;
			} catch {}
		}

		// Fallback para iOS WebKit
		isPseudoFullscreen = !isPseudoFullscreen;
		handleViewportResize(previousRatio);
	};

	const handleViewportResize = (preservedRatio?: number): void => {
		const ratio = typeof preservedRatio === "number" ? preservedRatio : (cachedMaxScroll > 0 ? scrollAccumulator / cachedMaxScroll : 0);
		calculateMetrics();
		if (cachedMaxScroll > 0) {
			const targetScroll = ratio * cachedMaxScroll;
			scrollAccumulator = targetScroll;
			if (scrollContainer) scrollContainer.scrollTop = targetScroll;
			syncUiDirect(targetScroll);
		}
	};

	// =========================================================================
	// ENTRADAS DE USUARIO
	// =========================================================================
	const adjustSpeed = (delta: number): void => {
		speed = Math.round(clamp(speed + delta, SPEED_MIN, SPEED_MAX));
	};

	const handleWheel = (event: WheelEvent): void => {
		if (!isPlaying) return;
		event.preventDefault();
		const dynamicIncrement = Math.max(8, speed * 0.1);
		adjustSpeed(event.deltaY > 0 ? dynamicIncrement : -dynamicIncrement);
	};

	const handleTouchStart = (e: TouchEvent): void => {
		if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
		touchStartY = e.touches[0].clientY;
	};

	const handleTouchMove = (e: TouchEvent): void => {
		if (!isPlaying) return;
		if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;

		const deltaY = touchStartY - e.touches[0].clientY;
		if (Math.abs(deltaY) > SWIPE_THRESHOLD_PX) {
			const speedStep = Math.sign(deltaY) * Math.max(2, Math.abs(deltaY) / 10);
			adjustSpeed(speedStep);
			touchStartY = e.touches[0].clientY;
		}
	};

	const handleFrameClick = (e: MouseEvent): void => {
		const target = e.target as HTMLElement | null;
		if (
			target?.tagName === "TEXTAREA" ||
			target?.closest(".teleprompter-panel") ||
			target?.closest(".teleprompter-float") ||
			target?.closest(".no-trigger")
		) {
			return;
		}

		const now = performance.now();
		if (now - lastTapTimestamp < TAP_THRESHOLD_MS) {
			toggleFullscreen();
			lastTapTimestamp = 0;
		} else {
			lastTapTimestamp = now;
			setTimeout(() => {
				if (lastTapTimestamp !== 0) {
					toggle();
					lastTapTimestamp = 0;
				}
			}, TAP_THRESHOLD_MS);
		}
	};

	const onKey = (event: KeyboardEvent): void => {
		if ((event.target as HTMLElement | null)?.tagName === "TEXTAREA") return;

		switch (event.code) {
			case "Space":
			case "Enter":
			case "NumpadEnter":
				event.preventDefault();
				toggle();
				break;
			case "ArrowUp":
				event.preventDefault();
				jump(-JUMP_SHORT_PX);
				break;
			case "ArrowDown":
				event.preventDefault();
				jump(JUMP_SHORT_PX);
				break;
			case "PageUp":
				event.preventDefault();
				jump(-JUMP_LONG_PX);
				break;
			case "PageDown":
				event.preventDefault();
				jump(JUMP_LONG_PX);
				break;
			case "KeyM":
				event.preventDefault();
				toggleMirror();
				break;
			case "KeyF":
				event.preventDefault();
				toggleFocusMode();
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
				setTimeout(() => handleViewportResize(), 150);
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
		}
	};

	// =========================================================================
	// PERSISTENCIA BLINDADA
	// =========================================================================
	const loadScripts = (): void => {
		const serialized = safeStorage.get(STORAGE_KEY_SCRIPTS);
		if (!serialized) {
			scripts = [];
			return;
		}
		try {
			const parsed = JSON.parse(serialized);
			scripts = Array.isArray(parsed) ? parsed : [];
		} catch {
			scripts = [];
			safeStorage.remove(STORAGE_KEY_SCRIPTS);
		}
	};

	const saveScripts = (scriptsToSave: SavedScript[]): void => {
		safeStorage.set(STORAGE_KEY_SCRIPTS, JSON.stringify(scriptsToSave));
		scripts = scriptsToSave;
	};

	const saveCurrentScript = (): void => {
		if (!text.trim()) return;
		const nowIso = new Date().toISOString();

		if (currentScript) {
			const index = scripts.findIndex((s) => s.id === currentScript);
			if (index >= 0) {
				scripts[index].text = text;
				scripts[index].updatedAt = nowIso;
				saveScripts(scripts);
				return;
			}
		}

		const newScriptRecord: SavedScript = {
			id: Date.now().toString(),
			name: `Guion ${scripts.length + 1}`,
			text,
			createdAt: nowIso,
			updatedAt: nowIso,
		};

		const updatedList = [newScriptRecord, ...scripts];
		if (updatedList.length > 20) updatedList.splice(20);

		saveScripts(updatedList);
		currentScript = newScriptRecord.id;
		safeStorage.set(STORAGE_KEY_LAST_SCRIPT, currentScript);
	};

	const loadScript = (id: string): void => {
		const targetScript = scripts.find((s) => s.id === id);
		if (targetScript && targetScript.text.trim()) {
			text = targetScript.text;
			currentScript = id;
			safeStorage.set(STORAGE_KEY_LAST_SCRIPT, id);
			resetScrollToStart();
			setTimeout(calculateMetrics, 60);
		}
	};

	const deleteScript = (id: string): void => {
		const updatedList = scripts.filter((s) => s.id !== id);
		saveScripts(updatedList);
		if (currentScript === id) {
			currentScript = null;
			safeStorage.remove(STORAGE_KEY_LAST_SCRIPT);
		}
	};

	const newScript = (): void => {
		currentScript = null;
		text = "";
		safeStorage.remove(STORAGE_KEY_LAST_SCRIPT);
		resetScrollToStart();
		setTimeout(calculateMetrics, 60);
	};

	const loadState = (): void => {
		const raw = safeStorage.get(STORAGE_KEY_STATE);
		if (!raw) return;

		try {
			const data = JSON.parse(raw) as Partial<TeleprompterPersistedState>;
			if (typeof data !== "object" || data === null) return;

			// Solo restaura si existe contenido válido
			if (typeof data.text === "string" && data.text.trim().length > 0) {
				text = data.text;
			}
			if (typeof data.speed === "number") speed = clamp(data.speed, SPEED_MIN, SPEED_MAX);
			if (typeof data.fontSize === "number") fontSize = data.fontSize;
			if (typeof data.lineHeight === "number") lineHeight = data.lineHeight;
			if (typeof data.isMirror === "boolean") isMirror = data.isMirror;
			if (typeof data.autoCenter === "boolean") autoCenter = data.autoCenter;
			if (typeof data.smooth === "boolean") smooth = data.smooth;
			if (typeof data.glow === "boolean") glow = data.glow;
			if (typeof data.focusMode === "boolean") focusMode = data.focusMode;
			if (typeof data.dimOutside === "boolean") dimOutside = data.dimOutside;
			if (typeof data.countdownDuration === "number") countdownDuration = data.countdownDuration;

			ultraClean = false;
			showControls = true;
		} catch {
			safeStorage.remove(STORAGE_KEY_STATE);
		}
	};

	const scheduleSave = (): void => {
		if (!isReady) return;
		if (saveDebounceTimer !== null) clearTimeout(saveDebounceTimer);

		const debounceDelayMs = text.length > 5000 ? 500 : 300;
		saveDebounceTimer = setTimeout(() => {
			if (!text.trim()) return;
			const payload: TeleprompterPersistedState = {
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
				countdownDuration,
			};
			safeStorage.set(STORAGE_KEY_STATE, JSON.stringify(payload));
			if (currentScript) {
				saveCurrentScript();
			}
		}, debounceDelayMs);
	};

	// =========================================================================
	// HELPERS VISUALES
	// =========================================================================
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
		if (isPlaying) return "oklch(0.60 0.15 220)";
		if (isCountingDown) return "oklch(0.65 0.15 60)";
		if (progress >= 0.999) return "oklch(0.50 0.05 var(--hue))";
		return "oklch(0.60 0.15 150)";
	};

	const getSpeedColor = (): string => {
		const ratio = (speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN);
		if (ratio < 0.33) return "oklch(0.65 0.15 150)";
		if (ratio < 0.66) return "oklch(0.70 0.15 60)";
		return "oklch(0.65 0.18 25)";
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

	const applyYouTubeSettings = (): void => {
		speed = 60;
		fontSize = 40;
		lineHeight = 1.75;
		isMirror = false;
		focusMode = true;
		autoCenter = true;
		countdownDuration = 3;
		applyMirrorToDOM();
		scheduleSave();
		resetScrollToStart();
		setTimeout(calculateMetrics, 60);
	};

	// =========================================================================
	// CICLO DE VIDA DEL COMPONENTE
	// =========================================================================
	$: if (
		isReady &&
		(text || speed || fontSize || lineHeight || isMirror || autoCenter ||
			smooth || glow || focusMode || dimOutside || countdownDuration)
	) {
		scheduleSave();
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

		window.addEventListener("keydown", onKey, { passive: false });
		const mql = window.matchMedia("(max-width: 768px)");
		isMobile = mql.matches;
		showMobileBanner = isMobile;

		applyStoredThemeToDocument();
		stopThemeWatch = watchSystemThemeChanges(getStoredTheme());

		loadState();
		loadScripts();

		const lastScriptId = safeStorage.get(STORAGE_KEY_LAST_SCRIPT);
		if (lastScriptId) {
			loadScript(lastScriptId);
		}

		const onboardingDone = safeStorage.get(STORAGE_KEY_ONBOARDING);
		if (!onboardingDone) {
			showOnboarding = true;
		}

		// ResizeObserver atómico sin loops de layout
		resizeObserver = new ResizeObserver(() => {
			if (!isPlaying) {
				handleViewportResize();
			}
		});
		if (scrollContainer) resizeObserver.observe(scrollContainer);

		const onFullscreenChange = (): void => {
			isFullscreen = Boolean(document.fullscreenElement);
			handleViewportResize();
		};

		document.addEventListener("fullscreenchange", onFullscreenChange);
		document.addEventListener("webkitfullscreenchange", onFullscreenChange);
		window.addEventListener("orientationchange", () => setTimeout(() => handleViewportResize(), 150));

		isReady = true;
		setTimeout(() => {
			calculateMetrics();
			applyMirrorToDOM();
			resetScrollToStart();
		}, 80);

		return () => {
			document.removeEventListener("fullscreenchange", onFullscreenChange);
			document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
		};
	});

	onDestroy(() => {
		if (typeof window !== "undefined") {
			window.removeEventListener("keydown", onKey);
		}
		pause();
		resizeObserver?.disconnect();
		darkModeObserver?.disconnect();

		if (saveDebounceTimer !== null) clearTimeout(saveDebounceTimer);
		if (countdownTimer !== null) clearInterval(countdownTimer);

		stopThemeWatch?.();
		stopThemeWatch = null;
	});
</script>
<div
	class="teleprompter-wrapper"
	class:clean={ultraClean}
	class:dark={isDark}
	class:pseudo-fullscreen={isPseudoFullscreen}
>
	{#if showOnboarding}
		<div class="teleprompter-onboarding-overlay">
			<div class="teleprompter-onboarding-card premium">
				<div class="onboarding-header">
					<div class="logo-gradient">🎬</div>
					<h2>Bienvenido al Teleprompter Premium</h2>
					<p class="subtitle">Tu estudio profesional de lectura en pantalla</p>
				</div>

				<div class="help-tabs">
					<button
						class="tab-btn"
						class:active={helpTab === 'quickstart'}
						on:click={() => (helpTab = 'quickstart')}
					>
						Inicio rápido
					</button>
					<button
						class="tab-btn"
						class:active={helpTab === 'youtube'}
						on:click={() => (helpTab = 'youtube')}
					>
						Ajustes YouTube
					</button>
					<button
						class="tab-btn"
						class:active={helpTab === 'shortcuts'}
						on:click={() => (helpTab = 'shortcuts')}
					>
						Atajos
					</button>
					<button
						class="tab-btn"
						class:active={helpTab === 'tips'}
						on:click={() => (helpTab = 'tips')}
					>
						Tips Pro
					</button>
				</div>

				<div class="tab-content">
					{#if helpTab === 'quickstart'}
						<div class="tab-panel">
							<div class="onboarding-step">
								<div class="step-icon">📝</div>
								<h3>1. Pega tu guion</h3>
								<p>Escribe o pega el texto. Si pegas texto denso, usa el botón "✨ Auto-Organizar" para estructurarlo en bloques de lectura óptimos.</p>
							</div>
							<div class="onboarding-step">
								<div class="step-icon">⚙️</div>
								<h3>2. Ajusta a tu ritmo</h3>
								<p>Personaliza velocidad, tamaño de fuente e interlineado para adaptarlo a la distancia de tu cámara.</p>
							</div>
							<div class="onboarding-step">
								<div class="step-icon">▶️</div>
								<h3>3. Empieza a grabar</h3>
								<p>Presiona Play o la barra espaciadora para comenzar la lectura sin saltos ni tirones.</p>
							</div>
						</div>
					{:else if helpTab === 'youtube'}
						<div class="tab-panel youtube-settings">
							<h3>⚙️ Configuración recomendada para YouTube</h3>
							<p class="tab-desc">Estos ajustes te ayudarán a grabar videos profesionales con lectura natural:</p>

							<div class="settings-list">
								<div class="setting-item">
									<span class="setting-label">🐢 Velocidad:</span>
									<span class="setting-value">50-70 px/seg (lectura natural sin parecer robot)</span>
								</div>
								<div class="setting-item">
									<span class="setting-label">📏 Tamaño fuente:</span>
									<span class="setting-value">38-42px (legible a distancia del monitor)</span>
								</div>
								<div class="setting-item">
									<span class="setting-label">📐 Interlineado:</span>
									<span class="setting-value">1.7-1.8 (espaciado cómodo para los ojos)</span>
								</div>
								<div class="setting-item">
									<span class="setting-label">🔄 Modo espejo:</span>
									<span class="setting-value">Activado para cristal divisor o cámara frontal / desactivado para lectura directa</span>
								</div>
								<div class="setting-item">
									<span class="setting-label">🎯 Focus mode:</span>
									<span class="setting-value">Activado (resalta la línea que estás leyendo)</span>
								</div>
								<div class="setting-item">
									<span class="setting-label">🎯 Auto-centrar:</span>
									<span class="setting-value">Activado siempre</span>
								</div>
								<div class="setting-item">
									<span class="setting-label">⏱️ Countdown:</span>
									<span class="setting-value">3 segundos (te da tiempo de prepararte)</span>
								</div>
							</div>

							<button class="btn-youtube-apply" on:click={() => {
								applyYouTubeSettings();
								helpTab = 'quickstart';
							}}>
								✨ Aplicar ajustes YouTube
							</button>
						</div>
					{:else if helpTab === 'shortcuts'}
						<div class="tab-panel shortcuts-panel">
							<h3>⌨️ Atajos de teclado</h3>
							<div class="shortcuts-table">
								<div class="shortcut-row">
									<span class="shortcut-key">Espacio / Enter</span>
									<span class="shortcut-desc">Play / Pausa</span>
								</div>
								<div class="shortcut-row">
									<span class="shortcut-key">R</span>
									<span class="shortcut-desc">Reiniciar desde el inicio</span>
								</div>
								<div class="shortcut-row">
									<span class="shortcut-key">↑ / ↓</span>
									<span class="shortcut-desc">Ajustar velocidad ±4</span>
								</div>
								<div class="shortcut-row">
									<span class="shortcut-key">PageUp / PageDn</span>
									<span class="shortcut-desc">Saltar páginas arriba / abajo</span>
								</div>
								<div class="shortcut-row">
									<span class="shortcut-key">M</span>
									<span class="shortcut-desc">Activar/desactivar modo espejo</span>
								</div>
								<div class="shortcut-row">
									<span class="shortcut-key">F</span>
									<span class="shortcut-desc">Activar/desactivar Focus Mode</span>
								</div>
								<div class="shortcut-row">
									<span class="shortcut-key">X</span>
									<span class="shortcut-desc">Pantalla completa</span>
								</div>
								<div class="shortcut-row">
									<span class="shortcut-key">L</span>
									<span class="shortcut-desc">Modo limpio (oculta todo excepto texto)</span>
								</div>
							</div>
						</div>
					{:else if helpTab === 'tips'}
						<div class="tab-panel tips-panel">
							<h3>💡 Consejos profesionales</h3>
							<div class="tips-list">
								<div class="tip-item-pro">
									<span class="tip-number">1</span>
									<div class="tip-content">
										<strong>Usa el Auto-Organizador</strong>
										<p>Convierte párrafos largos en oraciones digeribles para no perder aire ni contacto visual.</p>
									</div>
								</div>
								<div class="tip-item-pro">
									<span class="tip-number">2</span>
									<div class="tip-content">
										<strong>Practica el guion 2-3 veces antes de grabar</strong>
										<p>Familiarízate con el texto para una lectura más natural y fluida.</p>
									</div>
								</div>
								<div class="tip-item-pro">
									<span class="tip-number">3</span>
									<div class="tip-content">
										<strong>Mira a la cámara, no al texto</strong>
										<p>Posiciona el teleprompter lo más cerca posible del lente y usa visión periférica.</p>
									</div>
								</div>
								<div class="tip-item-pro">
									<span class="tip-number">4</span>
									<div class="tip-content">
										<strong>Ajusta la velocidad a tu respiración</strong>
										<p>No corras detrás del texto; calibra la velocidad para que acompañe tu cadencia natural.</p>
									</div>
								</div>
								<div class="tip-item-pro">
									<span class="tip-number">5</span>
									<div class="tip-content">
										<strong>Usa el Focus Mode para guiones largos</strong>
										<p>Atenúa las líneas periféricas reduciendo la fatiga visual en tomas continuas.</p>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<button
					class="btn-onboarding premium-btn"
					on:click={() => {
						showOnboarding = false;
						safeStorage.set(STORAGE_KEY_ONBOARDING, "true");
					}}
				>
					Comenzar
				</button>
			</div>
		</div>
	{/if}

	<div class="teleprompter-header">
		<div>
			<h1 class="teleprompter-title">Teleprompter</h1>
			<p class="teleprompter-subtitle">Tu estudio profesional de lectura en pantalla</p>
			<div class="status-row">
				<div class="status-indicator" style={`background-color: ${getStatusColor()}`}></div>
				<p class="teleprompter-status">{getStatus()}</p>
				{#if wordCount > 0}
					<span class="word-count">· {wordCount} palabras · {readingTimeLabel}</span>
				{/if}
			</div>
		</div>
		<div class="teleprompter-header-actions">
			<button
				class="btn-format"
				on:click={autoFormatScript}
				title="Formatea párrafos densos automáticamente para una lectura óptima"
			>
				✨ Auto-Organizar
			</button>
			<button
				class="btn-help"
				on:click={() => (showOnboarding = true)}
				title="Ver tutorial"
			>
				<span class="help-icon">?</span>
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
				{isFullscreen || isPseudoFullscreen ? "Salir pantalla completa" : "Pantalla completa (X)"}
			</button>
			<button
				class="btn-plain"
				class:active={ultraClean}
				on:click={() => {
					ultraClean = !ultraClean;
					setTimeout(() => calculateMetrics(), 150);
				}}
			>
				{ultraClean ? "Salir modo limpio" : "Modo limpio (L)"}
			</button>
		</div>
	</div>

	{#if showMobileBanner}
		<div class="mobile-tip-banner">
			<div class="mobile-tip-content">
				<span class="mobile-tip-icon">💡</span>
				<p>Para una experiencia completa, usa una pantalla más grande. <strong>👆 Toca</strong> para pausar · <strong>👆👆</strong> pantalla completa</p>
			</div>
			<button class="mobile-tip-close" on:click={() => (showMobileBanner = false)} aria-label="Cerrar">✕</button>
		</div>
	{/if}

	<div class="teleprompter-panel">
		<div class="script-manager">
			<label for="script-selector" class="manager-label">Guion guardado:</label>
			<div class="script-controls">
				<select
					id="script-selector"
					bind:value={currentScript}
					on:change={(e) => {
						const id = (e.target as HTMLSelectElement).value;
						if (id) loadScript(id);
					}}
				>
					<option value="">-- Nuevo guion --</option>
					{#each scripts as script}
						<option value={script.id}>
							{script.name} · {formatDateTime(script.updatedAt)}
						</option>
					{/each}
				</select>
				<button class="btn-icon" on:click={saveCurrentScript} title="Guardar guion actual">💾</button>
				<button class="btn-icon" on:click={newScript} title="Nuevo guion">➕</button>
				{#if currentScript}
					<button class="btn-icon" on:click={() => deleteScript(currentScript!)} title="Eliminar guion">🗑️</button>
				{/if}
			</div>
		</div>

		<textarea
			class="teleprompter-input no-trigger"
			bind:value={text}
			on:paste={handlePaste}
			rows={6}
			placeholder="Escribe o pega aquí tu guion..."
		></textarea>

		{#if showControls}
			<div class="teleprompter-controls no-trigger">
				<div class="controls-grid">
					<div class="control-group">
						<div class="control-label-row">
							<label title="Velocidad ideal: 40-80 px/seg para lectura natural">Velocidad</label>
							<span class="speed-label">{getSpeedLabel(speed)}</span>
						</div>
						<input
							type="range"
							class="custom-range"
							min={SPEED_MIN}
							max={SPEED_MAX}
							step="1"
							bind:value={speed}
						/>
						<div class="control-value-row">
							<span class="control-value">{speed} px/seg</span>
							<div
								class="speed-indicator-bar"
								style={`width: ${((speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100}%; background-color: ${getSpeedColor()}`}
							></div>
						</div>
					</div>

					<div class="control-group">
						<div class="control-label-row">
							<label>Tamaño</label>
						</div>
						<input
							type="range"
							class="custom-range"
							min="22"
							max="64"
							bind:value={fontSize}
							on:input={calculateMetrics}
						/>
						<div class="control-value-row">
							<span class="control-value">{fontSize}px</span>
						</div>
					</div>

					<div class="control-group">
						<div class="control-label-row">
							<label>Interlineado</label>
						</div>
						<input
							type="range"
							class="custom-range"
							min="1.2"
							max="2.2"
							step="0.05"
							bind:value={lineHeight}
							on:input={calculateMetrics}
						/>
						<div class="control-value-row">
							<span class="control-value">{lineHeight.toFixed(2)}</span>
						</div>
					</div>

					<div class="control-group">
						<div class="control-label-row">
							<label>Countdown</label>
						</div>
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
						<button
							class="toggle-btn"
							class:active={isMirror}
							on:click={() => toggleMirror()}
							title="Invierte el texto horizontalmente para cristales divisores o cámaras frontales"
						>
							Espejo (M)
						</button>
						<button
							class="toggle-btn"
							class:active={autoCenter}
							on:click={toggleAutoCenter}
							title="Mantiene el texto centrado en la pantalla"
						>
							Auto-centrar
						</button>
						<button
							class="toggle-btn"
							class:active={smooth}
							on:click={toggleSmooth}
							title="Transición suave entre velocidades"
						>
							Suave
						</button>
						<button
							class="toggle-btn"
							class:active={glow}
							on:click={toggleGlow}
							title="Efecto de brillo en la pantalla"
						>
							Glow
						</button>
						<button
							class="toggle-btn"
							class:active={focusMode}
							on:click={toggleFocusMode}
							title="Resalta la línea actual y oscurece el resto"
						>
							Focus (F)
						</button>
						<button
							class="toggle-btn"
							class:active={dimOutside}
							on:click={toggleDimOutside}
							title="Oscurece los extremos superior e inferior para concentrar la vista"
						>
							Oscurecer bordes
						</button>
					</div>
				</div>

				<div class="control-actions">
					<button class="btn-play" on:click={toggle}>
						{isPlaying ? "⏸ Pausar" : isCountingDown ? "⏹ Cancelar" : "▶ Reproducir"}
					</button>
					<button class="btn-action" on:click={reset}>Reiniciar (R)</button>
					<button class="btn-action" on:click={clearText}>Vaciar</button>
					<button class="btn-action" on:click={() => jump(-JUMP_ACTION_PX)}>↑ Saltar arriba</button>
					<button class="btn-action" on:click={() => jump(JUMP_ACTION_PX)}>↓ Saltar abajo</button>
				</div>
			</div>
		{/if}
	</div>

	<div
		class="teleprompter-screen"
		class:focus={focusMode}
		class:glow
		class:is-fullscreen={isFullscreen}
		bind:this={fullscreenTarget}
	>
		<div
			class="teleprompter-progress-top no-trigger"
			role="progressbar"
			aria-valuenow={Math.round(progress * 100)}
			aria-valuemin="0"
			aria-valuemax="100"
			tabindex="0"
			on:click={(e) => {
				const rect = e.currentTarget.getBoundingClientRect();
				const clickX = e.clientX - rect.left;
				scrollToProgressRatio(clickX / rect.width);
			}}
			on:keydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					scrollToProgressRatio(0.5);
				}
			}}
		>
			<div class="progress-bar" bind:this={progressBarElement}></div>
			<div class="time-remaining" class:visible={isPlaying || progress > 0} bind:this={timeRemainingElement}>0s</div>
		</div>

		<div class="reading-position-marker"></div>

		<!-- PADDING VINCULADO AL EJE ÓPTICO EXACTO -->
		<div
			class="teleprompter-frame"
			bind:this={scrollContainer}
			on:scroll={handleScroll}
			on:wheel={handleWheel}
			on:click={handleFrameClick}
			on:touchstart={handleTouchStart}
			on:touchmove={handleTouchMove}
			style:padding-top="{topPaddingPx}px"
			style:padding-bottom="{bottomPaddingPx}px"
			tabindex="-1"
		>
			<div
				class="teleprompter-content"
				class:mirror={isMirror}
				style={`font-size:${fontSize}px; line-height:${lineHeight}; letter-spacing: 0.01em;`}
				bind:this={content}
			>
				{#each lines as line, index}
					<p
						class:active={focusMode && index === activeLineIndex}
						class:dimmed={focusMode && index !== activeLineIndex}
						bind:this={lineElements[index]}
					>
						{line || " "}
					</p>
				{/each}
			</div>
		</div>

		{#if dimOutside}
			<div class="teleprompter-dim pointer-none"></div>
		{/if}

		<div class="teleprompter-float no-trigger">
			<button class="btn-float" on:click={toggle} title={isPlaying ? "Pausar" : "Reproducir"} aria-label={isPlaying ? "Pausar reproducción" : "Iniciar reproducción"}>
				{isPlaying ? "⏸" : isCountingDown ? "⏹" : "▶"}
			</button>
			<button class="btn-float" on:click={() => jump(-JUMP_SHORT_PX)} title="Saltar arriba" aria-label="Saltar hacia arriba">↑</button>
			<button class="btn-float" on:click={() => jump(JUMP_SHORT_PX)} title="Saltar abajo" aria-label="Saltar hacia abajo">↓</button>
			{#if isFullscreen || isPseudoFullscreen}
				<div class="float-speed-control">
					<input
						type="range"
						class="mini-range"
						min={SPEED_MIN}
						max={SPEED_MAX}
						step="1"
						bind:value={speed}
						aria-label="Control de velocidad"
					/>
					<span class="mini-speed">{speed}</span>
				</div>
			{/if}
			<button class="btn-float" class:active={isMirror} on:click={() => toggleMirror()} title="Espejo (M)" aria-label="Activar o desactivar modo espejo">M</button>
			<button class="btn-float" on:click={toggleFullscreen} title="Pantalla completa" aria-label="Activar o desactivar pantalla completa">⛶</button>
		</div>

		<div class="teleprompter-footer">
			<div class="shortcut">
				Espacio/Enter = Play · ↑/↓/Page = Saltos · M = Espejo · F = Focus · L = Ultra limpio · R
				= Reset · X = Fullscreen · Rueda = velocidad · +/- = Velocidad
			</div>
		</div>

		{#if isCountingDown}
			<div class="teleprompter-countdown">
				<span>{countdown}</span>
			</div>
		{/if}
	</div>
</div>
<style>
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

	/* =========================================================================
	   FALLBACK PSEUDO-FULLSCREEN PARA SAFARI IOS / WEBKIT MÓVIL
	   ========================================================================= */
	.teleprompter-wrapper.pseudo-fullscreen {
		position: fixed !important;
		inset: 0 !important;
		width: 100vw !important;
		height: 100vh !important;
		z-index: 99999 !important;
		background: #000000 !important;
		padding: 0 !important;
		margin: 0 !important;
	}

	.teleprompter-wrapper.pseudo-fullscreen .teleprompter-header,
	.teleprompter-wrapper.pseudo-fullscreen .teleprompter-panel,
	.teleprompter-wrapper.pseudo-fullscreen .teleprompter-footer {
		display: none !important;
	}

	.teleprompter-wrapper.pseudo-fullscreen .teleprompter-screen {
		height: 100vh !important;
		border-radius: 0 !important;
		min-height: unset !important;
	}

	/* =========================================================================
	   ONBOARDING Y MODAL DE AYUDA
	   ========================================================================= */
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

	:global(.dark) .teleprompter-onboarding-card,
	.dark .teleprompter-onboarding-card {
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

	.onboarding-step:nth-child(1) { animation-delay: 0.1s; }
	.onboarding-step:nth-child(2) { animation-delay: 0.2s; }
	.onboarding-step:nth-child(3) { animation-delay: 0.3s; }

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
		background: linear-gradient(135deg, oklch(0.70 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		color: white;
		border: none;
		border-radius: 0.75rem;
		padding: 0.85rem 2rem;
		font-weight: 700;
		font-size: 1.05rem;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.3s ease;
		box-shadow: 0 8px 20px oklch(0.70 0.14 var(--hue) / 0.35);
		animation: fadeInUp 0.5s ease forwards 0.4s;
		opacity: 0;
	}

	.btn-onboarding:hover {
		transform: translateY(-2px) scale(1.02);
		box-shadow: 0 12px 28px oklch(0.70 0.14 var(--hue) / 0.45);
	}

	.btn-onboarding:active {
		transform: translateY(0) scale(0.98);
	}

	.teleprompter-onboarding-card.premium {
		max-width: 800px;
	}

	.onboarding-header {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.logo-gradient {
		font-size: 4rem;
		margin-bottom: 1rem;
		animation: scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.onboarding-header h2 {
		font-size: 2rem;
		font-weight: 800;
		background: linear-gradient(135deg, oklch(0.70 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-bottom: 0.5rem;
	}

	.onboarding-header .subtitle {
		font-size: 1.1rem;
		color: #64748b;
		font-weight: 500;
	}

	:global(.dark) .onboarding-header .subtitle,
	.dark .onboarding-header .subtitle {
		color: #94a3b8;
	}

	.help-tabs {
		display: flex;
		gap: 0.5rem;
		border-bottom: 2px solid oklch(0.90 0.02 var(--hue));
		margin-bottom: 1.5rem;
		overflow-x: auto;
	}

	:global(.dark) .help-tabs,
	.dark .help-tabs {
		border-bottom-color: oklch(0.30 0.02 var(--hue));
	}

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
		min-height: 300px;
		animation: fadeIn 0.3s ease;
	}

	.tab-panel {
		animation: fadeInUp 0.3s ease;
	}

	.tab-desc {
		color: #64748b;
		margin-bottom: 1.5rem;
		line-height: 1.6;
	}

	:global(.dark) .tab-desc,
	.dark .tab-desc {
		color: #94a3b8;
	}

	.youtube-settings h3 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #0f172a;
		margin-bottom: 1rem;
	}

	:global(.dark) .youtube-settings h3,
	.dark .youtube-settings h3 {
		color: #e2e8f0;
	}

	.settings-list {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.setting-item {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem;
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
		min-width: 140px;
	}

	:global(.dark) .setting-label,
	.dark .setting-label {
		color: #e2e8f0;
	}

	.setting-value {
		color: #475569;
		line-height: 1.5;
	}

	:global(.dark) .setting-value,
	.dark .setting-value {
		color: #94a3b8;
	}

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

	.btn-youtube-apply:active {
		transform: translateY(0) scale(0.98);
	}

	.shortcuts-panel h3 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #0f172a;
		margin-bottom: 1.5rem;
	}

	:global(.dark) .shortcuts-panel h3,
	.dark .shortcuts-panel h3 {
		color: #e2e8f0;
	}

	.shortcuts-table {
		display: grid;
		gap: 0.5rem;
	}

	.shortcut-row {
		display: grid;
		grid-template-columns: 180px 1fr;
		gap: 1rem;
		padding: 0.75rem;
		background: oklch(0.97 0.01 var(--hue));
		border-radius: 0.5rem;
		align-items: center;
	}

	:global(.dark) .shortcut-row,
	.dark .shortcut-row {
		background: oklch(0.20 0.02 var(--hue));
	}

	.shortcut-key {
		font-family: 'Monaco', 'Courier New', monospace;
		font-weight: 700;
		color: oklch(0.60 0.14 var(--hue));
		background: oklch(0.94 0.01 var(--hue));
		padding: 0.35rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.9rem;
		text-align: center;
	}

	:global(.dark) .shortcut-key,
	.dark .shortcut-key {
		background: oklch(0.25 0.02 var(--hue));
		color: oklch(0.70 0.14 var(--hue));
	}

	.shortcut-desc {
		color: #475569;
		font-size: 0.95rem;
	}

	:global(.dark) .shortcut-desc,
	.dark .shortcut-desc {
		color: #94a3b8;
	}

	.tips-panel h3 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #0f172a;
		margin-bottom: 1.5rem;
	}

	:global(.dark) .tips-panel h3,
	.dark .tips-panel h3 {
		color: #e2e8f0;
	}

	.tips-list {
		display: grid;
		gap: 1rem;
	}

	.tip-item-pro {
		display: flex;
		gap: 1rem;
		padding: 1rem;
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
		min-width: 2rem;
		height: 2rem;
		background: oklch(0.70 0.14 var(--hue));
		color: white;
		border-radius: 50%;
		font-weight: 800;
		font-size: 1rem;
	}

	.tip-content strong {
		display: block;
		color: #0f172a;
		margin-bottom: 0.35rem;
		font-weight: 700;
	}

	:global(.dark) .tip-content strong,
	.dark .tip-content strong {
		color: #e2e8f0;
	}

	.tip-content p {
		color: #64748b;
		line-height: 1.5;
		font-size: 0.95rem;
		margin: 0;
	}

	:global(.dark) .tip-content p,
	.dark .tip-content p {
		color: #94a3b8;
	}

	.premium-btn {
		margin-top: 1rem;
	}

	/* =========================================================================
	   ENCABEZADO Y ACCIONES PRINCIPALES
	   ========================================================================= */
	.teleprompter-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.teleprompter-title {
		font-size: 2rem;
		font-weight: 700;
		background: linear-gradient(135deg, oklch(0.70 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
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

	:global(.dark) .teleprompter-subtitle,
	.dark .teleprompter-subtitle {
		color: #94a3b8;
	}

	.status-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

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

	:global(.dark) .teleprompter-status,
	.dark .teleprompter-status {
		color: #94a3b8;
	}

	.teleprompter-header-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.btn-format {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 1rem;
		background: linear-gradient(135deg, oklch(0.70 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 12px oklch(0.70 0.14 var(--hue) / 0.3);
	}

	.btn-format:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px oklch(0.70 0.14 var(--hue) / 0.45);
	}

	.btn-format:active {
		transform: translateY(0);
	}

	.btn-help {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: oklch(0.95 0.02 var(--hue));
		color: oklch(0.50 0.12 var(--hue));
		border: 1px solid oklch(0.85 0.05 var(--hue));
		border-radius: 999px;
		font-weight: 600;
		font-size: 0.9rem;
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
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: oklch(0.70 0.14 var(--hue));
		color: white;
		font-weight: 700;
		font-size: 0.85rem;
	}

	.help-badge {
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

	/* =========================================================================
	   PANEL DE CONTROL Y GESTIÓN DE GUIONES
	   ========================================================================= */
	.teleprompter-panel {
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(10px);
		border-radius: 1.25rem;
		padding: 1.5rem;
		border: 1px solid rgba(0, 0, 0, 0.08);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
		transition: all 0.3s ease;
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
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.manager-label {
		font-weight: 600;
		font-size: 0.9rem;
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
		padding: 0.6rem 1rem;
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
		padding: 0.6rem 0.9rem;
		background: oklch(0.95 0.02 var(--hue));
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		font-size: 1.1rem;
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

	.teleprompter-controls {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.controls-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.25rem;
	}

	@media (min-width: 768px) {
		.controls-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.control-group {
		background: rgba(255, 255, 255, 0.5);
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 0.75rem;
		padding: 1rem;
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
		margin-bottom: 0.75rem;
	}

	.control-group label {
		font-weight: 600;
		font-size: 0.9rem;
		color: #334155;
	}

	:global(.dark) .control-group label,
	.dark .control-group label {
		color: #cbd5e1;
	}

	.speed-label {
		font-size: 0.85rem;
		font-weight: 500;
		color: oklch(0.60 0.12 var(--hue));
		padding: 0.15rem 0.5rem;
		background: oklch(0.95 0.03 var(--hue));
		border-radius: 999px;
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
	}

	.control-value {
		font-size: 0.9rem;
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
		padding: 0.6rem 1rem;
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

	.control-group.toggles {
		grid-column: 1 / -1;
	}

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

	.control-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.btn-play {
		flex: 1;
		min-width: 180px;
		padding: 1rem 1.5rem;
		background: linear-gradient(135deg, oklch(0.70 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 30)));
		color: white;
		border: none;
		border-radius: 0.75rem;
		font-size: 1.05rem;
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

	/* =========================================================================
	   PANTALLA DE PROYECCIÓN Y GLOW DIRECTO (SIN TRANSICIÓN DE HEIGHT)
	   ========================================================================= */
	.teleprompter-screen {
		position: relative;
		background: linear-gradient(135deg, #f8fafc, #f1f5f9);
		border-radius: 1.25rem;
		overflow: hidden;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
		height: 65vh;
		min-height: 500px;
		transition: box-shadow 0.3s ease, border-color 0.3s ease;
		contain: content; /* AISLAMIENTO DE RENDERIZADO DEL RESTO DE LA PÁGINA */
	}

	:global(.dark) .teleprompter-screen,
	.dark .teleprompter-screen {
		background: linear-gradient(135deg, #0f172a, #1e293b);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(148, 163, 184, 0.1);
	}

	@media (max-width: 768px) {
		.teleprompter-screen {
			min-height: 350px;
			height: 60vh;
		}
	}

	.teleprompter-screen.glow {
		box-shadow: 0 0 35px oklch(0.70 0.14 var(--hue) / 0.45), inset 0 0 15px oklch(0.70 0.14 var(--hue) / 0.2) !important;
		border: 1px solid oklch(0.70 0.14 var(--hue) / 0.6) !important;
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
		height: 3px;
		background: rgba(0, 0, 0, 0.1);
		z-index: 10;
		cursor: pointer;
	}

	:global(.dark) .teleprompter-progress-top,
	.dark .teleprompter-progress-top {
		background: rgba(255, 255, 255, 0.1);
	}

	.progress-bar {
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, oklch(0.70 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 60)));
		box-shadow: 0 0 10px oklch(0.70 0.14 var(--hue) / 0.5);
		transform: scaleX(0);
		transform-origin: left center;
		will-change: transform;
		transition: none !important;
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
		opacity: 0;
		transition: opacity 0.2s ease;
		pointer-events: none;
	}

	.time-remaining.visible {
		opacity: 1;
	}

	/* GUÍA VISUAL ANCLADA AL 45% (RATIO ÓPTICO COINCIDENTE) */
	.reading-position-marker {
		position: absolute;
		top: 45%;
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

	/* =========================================================================
	   CONTENEDOR DE SCROLL NATIVO CON CONTENCIÓN ESTRICTA
	   ========================================================================= */
	.teleprompter-frame {
		height: 100%;
		overflow-y: auto;
		overflow-x: hidden;
		scroll-behavior: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
		will-change: scroll-position;
		overflow-anchor: none;
		box-sizing: border-box;
		padding-left: 2rem;
		padding-right: 2rem;
		contain: content;
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

	/* =========================================================================
	   REGLAS DEL TEXTO Y MODO ESPEJO
	   ========================================================================= */
	.teleprompter-content {
		color: #0f172a;
		text-align: center;
		user-select: none;
		width: 100%;
		margin: 0 auto;
		box-sizing: border-box;
		transform-origin: center center !important;
		-webkit-transform-origin: center center !important;
		transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
		backface-visibility: hidden;
		-webkit-font-smoothing: antialiased;
	}

	.teleprompter-content.mirror {
		transform: scaleX(-1) translateZ(0) !important;
		-webkit-transform: scaleX(-1) translateZ(0) !important;
		display: block;
	}

	:global(.dark) .teleprompter-content,
	.dark .teleprompter-content {
		color: #f1f5f9;
	}

	/* CAJA ESTÁTICA PARA ELIMINAR REFLOWS EN EL BUCLE DE ANIMACIÓN */
	.teleprompter-content p {
		margin: 0.75rem 0;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		line-height: inherit;
		min-height: 1.5em;
		box-sizing: border-box;
		border-left: 4px solid transparent;
		transition: opacity 0.2s ease, background-color 0.15s ease, border-color 0.15s ease;
	}

	.teleprompter-content p.active {
		background: rgba(0, 0, 0, 0.06);
		border-left-color: oklch(0.70 0.14 var(--hue));
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .teleprompter-content p.active,
	.dark .teleprompter-content p.active {
		background: rgba(255, 255, 255, 0.1);
		border-left-color: oklch(0.70 0.14 var(--hue));
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.teleprompter-screen.focus .teleprompter-content p.dimmed {
		opacity: 0.25;
		filter: blur(0.5px);
	}

	/* =========================================================================
	   VIÑETA CINEMATOGRÁFICA
	   ========================================================================= */
	.teleprompter-dim {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom,
			rgba(241, 245, 249, 0.98) 0%,
			rgba(241, 245, 249, 0.75) 12%,
			transparent 28%,
			transparent 72%,
			rgba(241, 245, 249, 0.75) 88%,
			rgba(241, 245, 249, 0.98) 100%
		);
		pointer-events: none;
		z-index: 15;
		transition: opacity 0.3s ease;
	}

	:global(.dark) .teleprompter-dim,
	.dark .teleprompter-dim {
		background: linear-gradient(
			to bottom,
			rgba(15, 23, 42, 0.98) 0%,
			rgba(15, 23, 42, 0.8) 12%,
			transparent 28%,
			transparent 72%,
			rgba(15, 23, 42, 0.8) 88%,
			rgba(15, 23, 42, 0.98) 100%
		);
	}

	/* =========================================================================
	   BARRA FLOTANTE Y CONTROLES OVERLAY
	   ========================================================================= */
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
		transition: all 0.3s ease;
		opacity: 0.7;
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
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-float:hover {
		background: oklch(0.70 0.14 var(--hue));
		border-color: oklch(0.70 0.14 var(--hue));
		transform: translateY(-2px) scale(1.05);
		box-shadow: 0 4px 12px oklch(0.70 0.14 var(--hue) / 0.4);
	}

	.btn-float.active {
		background: oklch(0.60 0.14 var(--hue));
		border-color: oklch(0.60 0.14 var(--hue));
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
	}

	.teleprompter-footer:hover {
		opacity: 0.9;
	}

	.shortcut {
		font-size: 0.8rem;
		color: #64748b;
		font-weight: 500;
	}

	:global(.dark) .shortcut,
	.dark .shortcut {
		color: #94a3b8;
	}

	.teleprompter-screen.is-fullscreen .teleprompter-footer {
		bottom: 5rem;
	}

	/* =========================================================================
	   CUENTA REGRESIVA
	   ========================================================================= */
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
	}

	.pointer-none {
		pointer-events: none;
	}

	.no-trigger {
		cursor: default;
	}

	/* =========================================================================
	   ANIMACIONES
	   ========================================================================= */
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

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

	@keyframes countdownPulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.1); }
	}

	/* =========================================================================
	   MEDIA QUERIES Y RESPONSIVE
	   ========================================================================= */
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
			bottom: 1rem;
			padding: 0.5rem;
			gap: 0.35rem;
		}

		.btn-float {
			width: 44px;
			height: 44px;
			font-size: 1.1rem;
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
			padding: 0.75rem;
		}

		.teleprompter-float {
			bottom: 0.5rem;
			padding: 0.4rem;
		}

		.btn-float {
			width: 36px;
			height: 36px;
			font-size: 0.9rem;
		}

		.teleprompter-footer {
			display: none;
		}
	}

	.word-count {
		margin-left: 0.5rem;
		font-size: 0.85rem;
		color: oklch(0.55 0.02 var(--hue));
	}

	:global(.dark) .word-count,
	.dark .word-count {
		color: oklch(0.70 0.02 var(--hue));
	}

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
		font-size: 1.1rem;
		flex-shrink: 0;
		line-height: 1.3;
	}

	.mobile-tip-content p {
		margin: 0;
		color: inherit;
		font-size: inherit;
		line-height: inherit;
	}

	.mobile-tip-content p strong {
		color: oklch(0.50 0.12 var(--hue));
		font-weight: 600;
	}

	:global(.dark) .mobile-tip-content p strong,
	.dark .mobile-tip-content p strong {
		color: oklch(0.72 0.12 var(--hue));
	}

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

	:global(.dark) .mobile-tip-close,
	.dark .mobile-tip-close {
		color: oklch(0.60 0.05 var(--hue));
	}

	:global(.dark) .mobile-tip-close:hover,
	.dark .mobile-tip-close:hover {
		background: oklch(0.30 0.04 var(--hue));
		color: oklch(0.80 0.06 var(--hue));
	}

	@media (min-width: 769px) {
		.mobile-tip-banner {
			display: none;
		}
	}
</style>
