<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import {
		applyStoredThemeToDocument,
		getStoredTheme,
		watchSystemThemeChanges,
	} from "@utils/setting-utils.ts";

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

	let scrollContainer: HTMLDivElement;
	let content: HTMLDivElement;
	let fullscreenTarget: HTMLDivElement;
	let raf: number | null = null;
	let lastTime = 0;
	let observer: IntersectionObserver | null = null;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let stopThemeWatch: (() => void) | null = null;

	const clamp = (value: number, min: number, max: number) =>
		Math.min(Math.max(value, min), max);

	const updateProgress = () => {
		if (!scrollContainer || !content) return;
		const maxScroll = content.scrollHeight - scrollContainer.clientHeight;
		progress = maxScroll <= 0 ? 0 : clamp(scrollContainer.scrollTop / maxScroll, 0, 1);
	};

	const tick = (time: number) => {
		if (!isPlaying || !scrollContainer || !content) return;
		if (!lastTime) lastTime = time;
		const delta = Math.min((time - lastTime) / 1000, 0.05);
		lastTime = time;

		const factor = smooth ? 1 : 1.35;
		const maxScroll = Math.max(content.scrollHeight - scrollContainer.clientHeight, 0);
		scrollContainer.scrollTop = Math.min(
			scrollContainer.scrollTop + speed * delta * factor,
			maxScroll,
		);
		updateProgress();

		if (scrollContainer.scrollTop >= maxScroll) {
			isPlaying = false;
			return;
		}
		raf = requestAnimationFrame(tick);
	};

	const start = () => {
		if (!isPlaying && scrollContainer) {
			isPlaying = true;
			lastTime = 0;
			raf = requestAnimationFrame(tick);
		}
	};

	const pause = () => {
		isPlaying = false;
		if (raf) cancelAnimationFrame(raf);
		raf = null;
	};

	const toggle = () => {
		if (isPlaying) {
			pause();
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
		const next = scrollContainer.scrollTop + amount;
		scrollContainer.scrollTop = clamp(next, 0, content.scrollHeight);
		updateProgress();
	};

	const scrollToProgress = (value: number) => {
		const maxScroll = content.scrollHeight - scrollContainer.clientHeight;
		scrollContainer.scrollTop = clamp(value, 0, 1) * Math.max(maxScroll, 0);
		updateProgress();
	};

	const toggleFullscreen = async () => {
		if (!fullscreenTarget) return;
		if (!document.fullscreenElement) {
			await fullscreenTarget.requestFullscreen();
		} else {
			await document.exitFullscreen();
		}
	};

	const handleWheel = (event: WheelEvent) => {
		if (isPlaying) {
			event.preventDefault();
			speed = clamp(speed + (event.deltaY > 0 ? 2 : -2), 18, 120);
		} else {
			jump(event.deltaY);
		}
	};

	const loadState = () => {
		try {
			const raw = localStorage.getItem(storageKey);
			if (!raw) return;
			const data = JSON.parse(raw) as Partial<{ text: string; speed: number; fontSize: number; lineHeight: number; isMirror: boolean; autoCenter: boolean; smooth: boolean; glow: boolean; focusMode: boolean; dimOutside: boolean; ultraClean: boolean; }>; 
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
		if (event.target && (event.target as HTMLElement).tagName === "TEXTAREA") return;
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
		}
	};

	$: scheduleSave();

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
		observer.observe(scrollContainer);

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
					<input type="range" min="18" max="120" bind:value={speed} />
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
					<button class="btn-regular" on:click={toggle}>{isPlaying ? "Pausar" : "Reproducir"}</button>
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
			on:scroll={updateProgress}
			on:wheel={handleWheel}
			style={`padding: ${autoCenter ? "35vh 2rem" : "2.5rem 2rem"};`}
		>
			<div
				class="teleprompter-content"
				style={`font-size:${fontSize}px; line-height:${lineHeight};`}
				bind:this={content}
			>
				{#each text.split("\n") as line}
					<p>{line}</p>
				{/each}
			</div>
			{#if focusMode}
				<div class="teleprompter-focus"></div>
				{#if dimOutside}
					<div class="teleprompter-dim"></div>
				{/if}
			{/if}
			<div class="teleprompter-float">
				<button class="btn-float" on:click={toggle}>{isPlaying ? "⏸" : "▶"}</button>
				<button class="btn-float" on:click={() => jump(-120)}>↑</button>
				<button class="btn-float" on:click={() => jump(120)}>↓</button>
				<button class="btn-float" on:click={() => (isMirror = !isMirror)}>M</button>
				<button class="btn-float" on:click={toggleFullscreen}>⛶</button>
				<button class="btn-float" on:click={() => (ultraClean = !ultraClean)}>🧼</button>
			</div>
		</div>

		<div class="teleprompter-footer">
			<div class="shortcut">Espacio/Enter = Play · ↑/↓/Page = Saltos · M = Espejo · F = Focus · L = Ultra limpio · R = Reset · X = Fullscreen · Rueda = velocidad</div>
		</div>
	</div>
</div>

<style>
	.teleprompter-wrapper {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		position: relative;
		color: var(--deep-text, #0f172a);
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
	.teleprompter-input {
		width: 100%;
		border-radius: 1rem;
		padding: 1rem;
		background: rgba(255,255,255,0.7);
		border: 1px solid rgba(15, 23, 42, 0.1);
		min-height: 140px;
		font-size: 1rem;
		color: var(--deep-text, #0f172a);
	}
	.teleprompter-input::placeholder {
		color: rgba(0, 0, 0, 0.5);
	}
	:global(.dark) .teleprompter-input {
		background: rgba(15,23,42,0.5);
		border-color: rgba(255,255,255,0.1);
		color: var(--deep-text, #e2e8f0);
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
	}
	.control-group span {
		font-size: 0.85rem;
		color: inherit;
		opacity: 0.7;
	}
	.control-group input[type="range"] {
		width: 100%;
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
	.control-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.teleprompter-screen {
		position: relative;
		border-radius: 1.5rem;
		overflow: hidden;
		background: radial-gradient(circle at top, rgba(255,255,255,0.9), rgba(255,255,255,0.6));
		border: 1px solid rgba(15, 23, 42, 0.08);
		box-shadow: 0 20px 80px rgba(15, 23, 42, 0.18);
		color: var(--deep-text, #0f172a);
	}
	:global(.dark) .teleprompter-screen {
		background: radial-gradient(circle at top, rgba(15,23,42,0.8), rgba(2,6,23,0.85));
		border-color: rgba(255,255,255,0.1);
		color: #e2e8f0;
	}
	.teleprompter-screen.glow {
		box-shadow: 0 20px 120px rgba(99,102,241,0.25);
	}
	:global(.teleprompter-screen:fullscreen) {
		width: 100vw;
		height: 100vh;
		border-radius: 0;
		background: #050816;
		color: inherit;
	}
	:global(.teleprompter-screen:fullscreen) .teleprompter-frame {
		height: 100vh;
		padding: 30vh 8vw;
	}
	.teleprompter-progress {
		height: 4px;
		background: rgba(99, 102,241, 0.1);
	}
	.teleprompter-progress .bar {
		height: 100%;
		background: linear-gradient(90deg, rgba(99, 102, 241, 0.8), rgba(14, 165, 233, 0.9));
		transition: width 0.2s ease;
	}
	.teleprompter-frame {
		height: 420px;
		overflow-y: auto;
		color: inherit;
	}
	.teleprompter-content,
	.teleprompter-content p {
		color: inherit;
	}
	.teleprompter-content p {
		margin-bottom: 1.5rem;
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
		top: 45%;
		height: 100px;
		border-top: 1px solid rgba(99,102,241,0.4);
		border-bottom: 1px solid rgba(99,102,241,0.4);
		pointer-events: none;
	}
	.teleprompter-dim {
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0) 40%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.45));
		pointer-events: none;
	}
	.teleprompter-float {
		position: absolute;
		right: 1.5rem;
		bottom: 1.5rem;
		display: grid;
		gap: 0.5rem;
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
	}
	.btn-float:hover {
		transform: translateY(-2px);
	}
	.teleprompter-footer {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		color: inherit;
		opacity: 0.7;
	}
	.shortcut {
		font-weight: 500;
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

	:global(.dark) .teleprompter-wrapper {
		color: #e2e8f0;
	}
	:global(.dark) .teleprompter-screen {
		color: #e2e8f0;
	}
</style>