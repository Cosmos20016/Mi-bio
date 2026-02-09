<script lang="ts">
import {
	applyStoredThemeToDocument,
	getStoredTheme,
	watchSystemThemeChanges,
} from "@utils/setting-utils.ts";
import { onDestroy, onMount } from "svelte";

const storageKey = "teleprompter:state:v2";

let text = `Pega aquí tu guion...
	

	Tip: Usa párrafos cortos para una lectura más cómoda.`;
let speed = 48; // px/seg
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
let allowMobile = false;
let showMobileNotice = false;
let isReady = false;
let ultraClean = false;
let countdown = 0;
let isCountingDown = false;

let scrollContainer: HTMLDivElement;
let content: HTMLDivElement;
let fullscreenTarget: HTMLDivElement;
let raf: number | null = null;
let lastTime = 0;
let observer: IntersectionObserver | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let stopThemeWatch: (() => void) | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let lineElements: Array<HTMLParagraphElement | null> = [];
let activeLineIndex = 0;
let lines: string[] = [];

const speedMin = 12;
const speedMax = 140;
const accelerationDuration = 0.18;
const countdownSeconds = 3;
let targetSpeed = speed;
let currentSpeed = speed;
let startTime = 0;

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const easeOutCubic = (value: number) => 1 - (1 - value) ** 3;

$: lines = text.split("\n");
$: lineElements = lines.map(() => null);

const updateProgress = () => {
	if (!scrollContainer || !content) return;
	const maxScroll = content.scrollHeight - scrollContainer.clientHeight;
	progress =
		maxScroll <= 0 ? 0 : clamp(scrollContainer.scrollTop / maxScroll, 0, 1);
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
	for (let i = 0; i < lineElements.length; i++) {
		const line = lineElements[i];
		if (!line) continue;
		const lineCenter = line.offsetTop + line.offsetHeight / 2;
		const distance = Math.abs(lineCenter - focusCenter);
		if (distance < closestDistance) {
			closestDistance = distance;
			closestIndex = i;
		} else if (distance > closestDistance) {
			break; // Las líneas están ordenadas, si la distancia empieza a crecer ya encontramos la más cercana
		}
	}
	activeLineIndex = closestIndex;
};

const tick = (time: number) => {
	if (!isPlaying || !scrollContainer || !content) {
		raf = null;
		return;
	}
	if (!lastTime) lastTime = time;
	if (!startTime) startTime = time;
	const delta = Math.min((time - lastTime) / 1000, 0.05);
	lastTime = time;

	const maxScroll = Math.max(
		content.scrollHeight - scrollContainer.clientHeight,
		0,
	);
	const accelerationProgress = Math.min(
		(time - startTime) / 1000 / accelerationDuration,
		1,
	);
	const rampFactor = easeOutCubic(accelerationProgress);
	const smoothingFactor = smooth ? 0.18 : 0.28;
	const speedFactor = smooth ? 1 : 1.25;
	currentSpeed += (targetSpeed - currentSpeed) * smoothingFactor;
	const step = currentSpeed * speedFactor * rampFactor * delta;

	scrollContainer.scrollTop = Math.min(
		scrollContainer.scrollTop + step,
		maxScroll,
	);
	updateProgress();

	if (scrollContainer.scrollTop >= maxScroll) {
		isPlaying = false;
		raf = null;
		return;
	}
	raf = requestAnimationFrame(tick);
};

const refreshPlayback = () => {
	speed = clamp(speed, speedMin, speedMax);
	targetSpeed = speed;
	if (!isPlaying) return;
	currentSpeed = Math.max(currentSpeed, targetSpeed * 0.4);
	if (!raf) {
		lastTime = 0;
		raf = requestAnimationFrame(tick);
	}
};

const startPlayback = () => {
	if (!scrollContainer || !content) return;
	if (raf) cancelAnimationFrame(raf);
	speed = clamp(speed, speedMin, speedMax);
	targetSpeed = speed;
	currentSpeed = Math.max(targetSpeed * 0.4, speedMin * 0.5);
	isPlaying = true;
	lastTime = 0;
	startTime = 0;
	raf = requestAnimationFrame(tick);
};

const cancelCountdown = () => {
	if (countdownTimer) clearInterval(countdownTimer);
	countdownTimer = null;
	countdown = 0;
	isCountingDown = false;
};

const beginCountdown = () => {
	if (isCountingDown) return;
	if (countdownSeconds <= 0) {
		startPlayback();
		return;
	}
	cancelCountdown();
	countdown = countdownSeconds;
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
	isPlaying = false;
	cancelCountdown();
	if (raf) cancelAnimationFrame(raf);
	raf = null;
	lastTime = 0;
	startTime = 0;
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
	}
	updateProgress();
};

const clearText = () => {
	pause();
	text = "";
	if (scrollContainer) {
		scrollContainer.scrollTop = 0;
	}
	updateProgress();
};

const jump = (amount: number) => {
	if (!scrollContainer || !content) return;
	const next = scrollContainer.scrollTop + amount;
	scrollContainer.scrollTop = clamp(next, 0, content.scrollHeight);
	updateProgress();
};

const scrollToProgress = (value: number) => {
	if (!scrollContainer || !content) return;
	const maxScroll = content.scrollHeight - scrollContainer.clientHeight;
	scrollContainer.scrollTop = clamp(value, 0, 1) * Math.max(maxScroll, 0);
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
	} catch {
		// Fullscreen not supported or blocked
	}
};

// Mouse wheel handler: Controls teleprompter speed during playback
// Scroll down (deltaY > 0) = decrease speed, Scroll up (deltaY < 0) = increase speed
const handleWheel = (event: WheelEvent) => {
	event.preventDefault();
	if (!scrollContainer || !content) return;
	const delta = event.deltaY > 0 ? 2 : -2;
	adjustSpeed(delta);
};

const adjustSpeed = (amount: number) => {
	speed = clamp(speed + amount, speedMin, speedMax);
	targetSpeed = speed;
	refreshPlayback();
};

const loadState = () => {
	try {
		const raw = localStorage.getItem(storageKey);
		if (!raw) return;
		const data = JSON.parse(raw) as Partial<{
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
			ultraClean: boolean;
		}>;
		if (data.text) text = data.text;
		if (data.speed) speed = data.speed;
		if (data.fontSize) fontSize = data.fontSize;
		if (data.lineHeight) lineHeight = data.lineHeight;
		if (typeof data.isMirror === "boolean") isMirror = data.isMirror;
		if (typeof data.autoCenter === "boolean") autoCenter = data.autoCenter;
		if (typeof data.smooth === "boolean") smooth = data.smooth;
		if (typeof data.glow === "boolean") glow = data.glow;
		if (typeof data.focusMode === "boolean") focusMode = data.focusMode;
		if (typeof data.dimOutside === "boolean") dimOutside = data.dimOutside;
		if (typeof data.ultraClean === "boolean") ultraClean = data.ultraClean;
		speed = clamp(speed, speedMin, speedMax);
		targetSpeed = speed;
		currentSpeed = speed;
	} catch {
		// ignore invalid storage
	}
};

const scheduleSave = () => {
	if (!isReady) return;
	if (saveTimeout) clearTimeout(saveTimeout);
	saveTimeout = setTimeout(() => {
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
		};
		localStorage.setItem(storageKey, JSON.stringify(payload));
	}, 300);
};

const onKey = (event: KeyboardEvent) => {
	if (event.target && (event.target as HTMLElement).tagName === "TEXTAREA")
		return;
	switch (event.code) {
		case "Space":
			event.preventDefault();
			toggle();
			break;
		case "Enter":
		case "NumpadEnter":
			event.preventDefault();
			toggle();
			break;
		case "ArrowUp":
			event.preventDefault();
			jump(-120);
			break;
		case "ArrowDown":
			event.preventDefault();
			jump(120);
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
			isMirror = !isMirror;
			break;
		case "KeyF":
			focusMode = !focusMode;
			break;
		case "KeyR":
			reset();
			break;
		case "KeyX":
			toggleFullscreen();
			break;
		case "KeyL":
			ultraClean = !ultraClean;
			break;
		case "Equal":
		case "NumpadAdd":
			adjustSpeed(4);
			break;
		case "Minus":
		case "NumpadSubtract":
			adjustSpeed(-4);
			break;
	}
};

$: {
	// Trigger save when any of these properties change
	text;
	speed;
	fontSize;
	lineHeight;
	isMirror;
	autoCenter;
	smooth;
	glow;
	focusMode;
	dimOutside;
	ultraClean;
	scheduleSave();
}

onMount(() => {
	window.addEventListener("keydown", onKey);
	const mql = window.matchMedia("(max-width: 768px)");
	isMobile = mql.matches;
	showMobileNotice = false;
	allowMobile = true;

	applyStoredThemeToDocument();
	stopThemeWatch = watchSystemThemeChanges(getStoredTheme());

	loadState();
	updateProgress();
	observer?.disconnect();
	observer = new IntersectionObserver(() => updateProgress());
	if (scrollContainer) {
		observer.observe(scrollContainer);
	}

	const onFullscreenChange = () => {
		isFullscreen = Boolean(document.fullscreenElement);
	};
	document.addEventListener("fullscreenchange", onFullscreenChange);
	isReady = true;

	return () => {
		document.removeEventListener("fullscreenchange", onFullscreenChange);
	};
});

onDestroy(() => {
	window.removeEventListener("keydown", onKey);
	pause();
	observer?.disconnect();
	if (saveTimeout) clearTimeout(saveTimeout);
	stopThemeWatch?.();
	stopThemeWatch = null;
	if (countdownTimer) clearInterval(countdownTimer);
});
</script>

<div class="teleprompter-wrapper" class:clean={ultraClean}>
	{#if showMobileNotice && !allowMobile}
		<div class="teleprompter-mobile-overlay">
			<div class="teleprompter-mobile-card">
				<h2>Teleprompter recomendado para PC</h2>
				<p>
					Esta herramienta está optimizada para pantallas grandes. Puedes continuar en
					 móvil, pero la experiencia será limitada.
				</p>
				<div class="teleprompter-mobile-actions">
					<button class="btn-regular" on:click={() => (allowMobile = true)}>Continuar</button>
					<a class="btn-plain" href="/herramientas/">Volver</a>
				</div>
			</div>
		</div>
	{/if}

	<div class="teleprompter-header">
		<div>
			<h1 class="teleprompter-title">Teleprompter</h1>
			<p class="teleprompter-subtitle">Lectura fluida y profesional para tus guiones.</p>
		</div>
		<div class="teleprompter-header-actions">
			<button class="btn-plain teleprompter-toggle" on:click={() => (showControls = !showControls)}>
				{showControls ? "Ocultar controles" : "Mostrar controles"}
			</button>
			<button class="btn-plain" on:click={toggleFullscreen}>
				{isFullscreen ? "Salir pantalla completa" : "Pantalla completa (X)"}
			</button>
			<button class="btn-plain" on:click={() => (ultraClean = !ultraClean)}>
				{ultraClean ? "Salir modo limpio" : "Modo limpio (L)"}
			</button>
		</div>
	</div>

	<div class="teleprompter-panel">
		<textarea
			class="teleprompter-input"
			bind:value={text}
			rows={6}
			placeholder="Escribe o pega aquí tu guion..."
		></textarea>

		{#if showControls}
			<div class="teleprompter-controls">
				<div class="control-group">
					<label>Velocidad</label>
					<input type="range" min={speedMin} max={speedMax} bind:value={speed} on:input={refreshPlayback} />
					<span>{speed} px/seg</span>
				</div>
				<div class="control-group">
					<label>Tamaño</label>
					<input type="range" min="22" max="64" bind:value={fontSize} />
					<span>{fontSize}px</span>
				</div>
				<div class="control-group">
					<label>Interlineado</label>
					<input type="range" min="1.2" max="2.2" step="0.05" bind:value={lineHeight} />
					<span>{lineHeight.toFixed(2)}</span>
				</div>
				<div class="control-group">
					<label>Progreso</label>
					<input
						type="range"
						min="0"
						max="100"
						value={Math.round(progress * 100)}
						on:input={(event) => scrollToProgress(Number((event.target as HTMLInputElement).value) / 100)}
					/>
					<span>{Math.round(progress * 100)}%</span>
				</div>
				<div class="control-group toggles">
					<label>Opciones</label>
					<div class="toggle-grid">
						<button class:active={isMirror} on:click={() => (isMirror = !isMirror)}>Espejo (M)</button>
						<button class:active={autoCenter} on:click={() => (autoCenter = !autoCenter)}>Auto-centrar</button>
						<button class:active={smooth} on:click={() => (smooth = !smooth)}>Suave</button>
						<button class:active={glow} on:click={() => (glow = !glow)}>Glow</button>
						<button class:active={focusMode} on:click={() => (focusMode = !focusMode)}>Focus (F)</button>
						<button class:active={dimOutside} on:click={() => (dimOutside = !dimOutside)}>Oscurecer bordes</button>
						<button class:active={ultraClean} on:click={() => (ultraClean = !ultraClean)}>Ultra limpio (L)</button>
					</div>
				</div>
				<div class="control-actions">
					<button class="btn-regular" on:click={toggle}>{isPlaying ? "Pausar" : isCountingDown ? "Cancelar" : "Reproducir"}</button>
					<button class="btn-plain" on:click={reset}>Reiniciar (R)</button>
					<button class="btn-plain" on:click={clearText}>Vaciar</button>
					<button class="btn-plain" on:click={() => jump(-240)}>↑</button>
					<button class="btn-plain" on:click={() => jump(240)}>↓</button>
					<button class="btn-plain" on:click={toggleFullscreen}>Pantalla completa</button>
				</div>
			</div>
		{/if}
	</div>

	<div
		class="teleprompter-screen"
		class:mirror={isMirror}
		class:focus={focusMode}
		class:glow={glow}
		bind:this={fullscreenTarget}
	>
		<div class="teleprompter-progress">
			<div class="bar" style={`width: ${progress * 100}%`}></div>
		</div>
		<div
			class="teleprompter-frame"
			bind:this={scrollContainer}
			on:wheel|preventDefault={handleWheel}
			style={`padding: ${autoCenter ? "35vh 2rem" : "2.5rem 2rem"};`}
		>
			<div
				class="teleprompter-content"
				style={`font-size:${fontSize}px; line-height:${lineHeight};`}
				bind:this={content}
			>
				{#each lines as line, index}
					<p class:active={index === activeLineIndex} bind:this={lineElements[index]}>{line}</p>
				{/each}
			</div>
		</div>
		{#if focusMode}
			<div class="teleprompter-focus"></div>
			{#if dimOutside}
				<div class="teleprompter-dim"></div>
			{/if}
		{/if}

		<div class="teleprompter-float">
			<button class="btn-float" on:click={toggle}>{isPlaying ? "⏸" : isCountingDown ? "⏹" : "▶"}</button>
			<button class="btn-float" on:click={() => jump(-120)}>↑</button>
			<button class="btn-float" on:click={() => jump(120)}>↓</button>
			<button class="btn-float" on:click={() => (isMirror = !isMirror)}>M</button>
			<button class="btn-float" on:click={toggleFullscreen}>⛶</button>
			<button class="btn-float" on:click={() => (ultraClean = !ultraClean)}>🧼</button>
		</div>

		<div class="teleprompter-footer">
			<div class="shortcut">Espacio/Enter = Play · ↑/↓/Page = Saltos · M = Espejo · F = Focus · L = Ultra limpio · R = Reset · X = Fullscreen · Rueda = velocidad · +/- = Velocidad</div>
		</div>

		{#if isCountingDown}
			<div class="teleprompter-countdown">
				<span>{countdown}</span>
			</div>
		{/if}
	</div>

	<style>
		.teleprompter-wrapper {
			display: flex;
			flex-direction: column;
			gap: 1.5rem;
			position: relative;
			color: var(--deep-text, #0f172a);
			font-family: inherit;
		}
		:global(.dark) .teleprompter-wrapper {
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
		.teleprompter-mobile-overlay {
			position: absolute;
			inset: 0;
			background: rgba(0, 0, 0, 0.6);
			backdrop-filter: blur(6px);
			z-index: 20;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 1.5rem;
		}
		.teleprompter-mobile-card {
			max-width: 420px;
			background: var(--card-bg);
			border-radius: 1.25rem;
			padding: 1.5rem;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
			border: 1px solid rgba(255, 255, 255, 0.1);
			color: inherit;
			font-family: inherit;
		}
		.teleprompter-mobile-card h2 {
			font-size: 1.2rem;
			margin-bottom: 0.5rem;
		}
		.teleprompter-mobile-card p {
			color: inherit;
			opacity: 0.8;
			margin-bottom: 1rem;
		}
		.teleprompter-mobile-actions {
			display: flex;
			gap: 0.75rem;
			flex-wrap: wrap;
		}
		:global(.dark) .teleprompter-mobile-card {
			background: var(--card-bg);
			border-color: rgba(255, 255, 255, 0.12);
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		}
		.teleprompter-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 1rem;
		}
		.teleprompter-header-actions {
			display: flex;
			gap: 0.75rem;
			flex-wrap: wrap;
		}
		.teleprompter-title {
			font-size: 2rem;
			font-weight: 700;
			color: inherit;
		}
		.teleprompter-subtitle {
			color: inherit;
			opacity: 0.7;
		}
		.teleprompter-panel {
			background: var(--card-bg);
			border-radius: 1.25rem;
			padding: 1.5rem;
			box-shadow: 0 18px 60px rgba(15, 23, 42, 0.15);
			color: inherit;
		}
		:global(.dark) .teleprompter-panel {
			background: var(--card-bg);
			box-shadow: 0 18px 60px rgba(0, 0, 0, 0.4);
			border: 1px solid rgba(255, 255, 255, 0.08);
		}
		.teleprompter-input {
			width: 100%;
			border-radius: 1rem;
			padding: 1rem;
			background: rgba(255,255,255,0.7);
			border: 1px solid rgba(15, 23, 42, 0.1);
			min-height: 140px;
			font-size: 1rem;
			color: inherit;
			scrollbar-width: thin;
			scrollbar-color: rgba(99, 102, 241, 0.6) rgba(148, 163, 184, 0.2);
			font-family: inherit;
		}
		.teleprompter-input::-webkit-scrollbar {
			width: 8px;
		}
		.teleprompter-input::-webkit-scrollbar-track {
			background: rgba(148, 163, 184, 0.2);
			border-radius: 999px;
		}
		.teleprompter-input::-webkit-scrollbar-thumb {
			background: linear-gradient(180deg, rgba(99, 102, 241, 0.75), rgba(14, 165, 233, 0.75));
			border-radius: 999px;
			border: 2px solid transparent;
			background-clip: padding-box;
			box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
		}
		.teleprompter-input::-webkit-scrollbar-thumb:hover {
			background: linear-gradient(180deg, rgba(99, 102, 241, 0.95), rgba(14, 165, 233, 0.95));
		}
		.teleprompter-input::placeholder {
			color: rgba(0, 0, 0, 0.5);
		}
		:global(.dark) .teleprompter-input {
			background: rgba(15,23,42,0.5);
			border-color: rgba(255,255,255,0.1);
			color: inherit;
			scrollbar-color: rgba(99, 102, 241, 0.6) rgba(15, 23, 42, 0.6);
		}
		:global(.dark) .teleprompter-input::-webkit-scrollbar-track {
			background: rgba(15, 23, 42, 0.6);
		}
		:global(.dark) .teleprompter-input::placeholder {
			color: rgba(255, 255, 255, 0.6);
		}
		.teleprompter-controls {
			margin-top: 1.5rem;
			display: grid;
			gap: 1rem;
		}
		.control-group {
			display: grid;
			gap: 0.5rem;
		}
		.control-group label {
			font-weight: 600;
			color: inherit;
			font-family: inherit;
		}
		.control-group span {
			font-size: 0.85rem;
			color: inherit;
			opacity: 0.7;
			font-family: inherit;
		}
		.control-group input[type="range"] {
			width: 100%;
		}
		:global(.dark) .control-group input[type="range"] {
			accent-color: rgba(99, 102, 241, 0.8);
		}
		.toggle-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
			gap: 0.5rem;
		}
		.toggle-grid button {
			border-radius: 0.75rem;
			padding: 0.55rem 0.75rem;
			border: 1px solid rgba(15, 23, 42, 0.12);
			background: rgba(255,255,255,0.7);
			transition: transform 0.2s ease, box-shadow 0.2s ease;
			font-weight: 600;
			color: inherit;
			font-family: inherit;
		}
		.toggle-grid button.active {
			background: rgba(99,102,241, 0.2);
			border-color: rgba(99,102,241, 0.6);
		}
		.toggle-grid button:hover {
			transform: translateY(-1px);
			box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
		}
		:global(.dark) .toggle-grid button {
			background: rgba(15,23,42,0.5);
			border-color: rgba(255,255,255,0.1);
			color: white;
		}
		:global(.dark) .toggle-grid button.active {
			background: rgba(99, 102, 241, 0.3);
			border-color: rgba(99, 102, 241, 0.7);
			color: #e2e8f0;
		}
		.control-actions {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
		}
		.teleprompter-screen {
			position: relative;
			border-radius: 1.5rem;
			overflow: hidden;
			background: linear-gradient(180deg, #ffffff, #f8fafc);
			border: 1px solid rgba(148, 163, 184, 0.2);
			box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.06);
			color: inherit;
		}
		.teleprompter-screen::before {
			content: "";
			position: absolute;
			inset: 0;
			background: radial-gradient(circle at top, rgba(99, 102, 241, 0.12), transparent 55%),
				radial-gradient(circle at bottom, rgba(14, 165, 233, 0.08), transparent 60%);
			opacity: 0.35;
			pointer-events: none;
			z-index: 0;
		}
		:global(.dark) .teleprompter-screen {
			background: linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.98));
			border-color: rgba(148, 163, 184, 0.18);
			box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(148, 163, 184, 0.12) inset;
			color: inherit;
		}
		:global(.dark) .teleprompter-screen::before {
			background: radial-gradient(circle at top, rgba(99, 102, 241, 0.18), transparent 55%),
				radial-gradient(circle at bottom, rgba(14, 165, 233, 0.12), transparent 60%);
			opacity: 0.6;
		}
		.teleprompter-screen.glow {
			box-shadow: 0 20px 120px rgba(99,102,241,0.25);
		}
		:global(.teleprompter-screen:fullscreen) {
			width: 100vw;
			height: 100vh;
			border-radius: 0;
			background: #f8fafc;
			color: #0f172a;
		}
		:global(.dark) .teleprompter-screen:fullscreen {
			background: #050816;
			color: #e2e8f0;
		}
		:global(.teleprompter-screen:fullscreen) .teleprompter-frame {
			height: 100vh;
			padding: 30vh 8vw;
		}
		.teleprompter-progress {
			position: relative;
			height: 4px;
			background: rgba(99, 102,241, 0.1);
			z-index: 1;
		}
		.teleprompter-progress .bar {
			height: 100%;
			background: linear-gradient(90deg, rgba(99, 102,241, 0.8), rgba(14, 165, 233, 0.9));
			transition: width 0.2s ease;
		}
		.teleprompter-frame {
			position: relative;
			height: 420px;
			overflow-y: auto;
			color: inherit;
			scrollbar-width: thin;
			scrollbar-color: rgba(99, 102, 241, 0.6) rgba(148, 163, 184, 0.18);
			scrollbar-gutter: stable;
			overscroll-behavior: contain;
			z-index: 1;
		}
		.teleprompter-frame::-webkit-scrollbar {
			width: 10px;
		}
		.teleprompter-frame::-webkit-scrollbar-track {
			background: rgba(148, 163, 184, 0.18);
			border-radius: 999px;
		}
		.teleprompter-frame::-webkit-scrollbar-thumb {
			background: linear-gradient(180deg, rgba(99, 102, 241, 0.7), rgba(14, 165, 233, 0.7));
			border-radius: 999px;
			border: 2px solid transparent;
			background-clip: padding-box;
			box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
		}
		.teleprompter-frame::-webkit-scrollbar-thumb:hover {
			background: linear-gradient(180deg, rgba(99, 102, 241, 0.9), rgba(14, 165, 233, 0.9));
		}
		:global(.dark) .teleprompter-frame {
			scrollbar-color: rgba(99, 102, 241, 0.6) rgba(15, 23, 42, 0.5);
		}
		:global(.dark) .teleprompter-frame::-webkit-scrollbar-track {
			background: rgba(15, 23, 42, 0.5);
		}
		.teleprompter-content,
		.teleprompter-content p {
			color: inherit;
			font-family: inherit;
		}
		.teleprompter-content p {
			margin-bottom: 1.5rem;
			padding: 0.1rem 0.35rem;
			border-radius: 0.5rem;
			transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
		}
		.teleprompter-content p.active {
			background: rgba(99, 102, 241, 0.2);
			box-shadow: 0 10px 24px rgba(99, 102, 241, 0.25);
			transform: translateX(6px);
		}
		:global(.dark) .teleprompter-content p.active {
			background: rgba(99, 102, 241, 0.25);
			box-shadow: 0 12px 26px rgba(15, 23, 42, 0.4);
		}
		.teleprompter-screen.mirror .teleprompter-content {
			transform: scaleX(-1);
		}
		.teleprompter-screen.focus .teleprompter-frame {
			position: relative;
		}
		.teleprompter-focus {
			position: absolute;
			left: 0;
			right: 0;
			top: 50%;
			transform: translateY(-50%);
			height: 110px;
			border-top: 1px solid rgba(99,102,241,0.4);
			border-bottom: 1px solid rgba(99,102,241,0.4);
			pointer-events: none;
			z-index: 3;
		}
		.teleprompter-dim {
			position: absolute;
			inset: 4px 0 0 0;
			background: linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0) 40%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.45));
			pointer-events: none;
			z-index: 2;
		}
		.teleprompter-float {
			position: absolute;
			right: 1.5rem;
			bottom: 1.5rem;
			display: grid;
			gap: 0.5rem;
			z-index: 4;
		}
		.btn-float {
			width: 44px;
			height: 44px;
			border-radius: 50%;
			border: none;
			background: rgba(99, 102, 241, 0.9);
			color: white;
			font-weight: 700;
			box-shadow: 0 12px 30px rgba(99,102,241,0.3);
			cursor: pointer;
			transition: transform 0.2s ease;
			font-family: inherit;
		}
		.btn-float:hover {
			transform: translateY(-2px);
		}
		:global(.dark) .btn-float {
			background: rgba(99, 102, 241, 0.85);
			box-shadow: 0 12px 30px rgba(99, 102, 241, 0.4);
		}
		.teleprompter-footer {
			position: relative;
			display: flex;
			justify-content: space-between;
			font-size: 0.85rem;
			color: inherit;
			opacity: 0.7;
			z-index: 1;
		}
		.shortcut {
			font-weight: 500;
			font-family: inherit;
		}
		:global(.dark) .teleprompter-footer {
			color: #cbd5e1;
		}
		.teleprompter-countdown {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			background: rgba(15, 23, 42, 0.45);
			backdrop-filter: blur(3px);
			z-index: 4;
			font-size: clamp(3.5rem, 9vw, 6rem);
			font-weight: 800;
			color: #f8fafc;
			text-shadow: 0 18px 40px rgba(15, 23, 42, 0.6);
			pointer-events: none;
		}
		.teleprompter-countdown span {
			font-family: inherit;
		}
		:global(.dark) .teleprompter-countdown {
			background: rgba(2, 6, 23, 0.6);
			color: #f1f5f9;
		}
		@media (max-width: 768px) {
			.teleprompter-header {
				flex-direction: column;
				align-items: flex-start;
			}
			.teleprompter-header-actions {
				width: 100%;
			}
			.teleprompter-frame {
				height: 320px;
				padding: 2rem 1.25rem;
			}
			.teleprompter-float {
				right: 1rem;
				bottom: 1rem;
			}
		}
	</style>
</div>
