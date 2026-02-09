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
	let countdown = 0;
	let isCountingDown = false;
	let showOnboarding = false;
	let showHelp = false;
	let currentScript: string | null = null;

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

	const speedMin = 20;
	const speedMax = 300;
	const accelerationDuration = 0.8;
	const countdownSeconds = 3;
	let targetSpeed = speed;
	let currentSpeed = speed;
	let startTime = 0;

	const clamp = (value: number, min: number, max: number) =>
		Math.min(Math.max(value, min), max);

	const easeInOutSine = (value: number) => -(Math.cos(Math.PI * value) - 1) / 2;

	$: lines = text.split("\n");
	// Don't destroy refs - keep existing elements
	$: if (lineElements.length !== lines.length) {
		lineElements = lines.map((_, i) => lineElements[i] || null);
	}

	const updateProgress = () => {
		if (!scrollContainer || !content) return;
		const maxScroll = content.scrollHeight - scrollContainer.clientHeight;
		progress = maxScroll <= 0 ? 0 : clamp(scrollContainer.scrollTop / maxScroll, 0, 1);
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
		lineElements.forEach((line, index) => {
			if (!line) return;
			const lineCenter = line.offsetTop + line.offsetHeight / 2;
			const distance = Math.abs(lineCenter - focusCenter);
			if (distance < closestDistance) {
				closestDistance = distance;
				closestIndex = index;
			}
		});
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

		const maxScroll = Math.max(content.scrollHeight - scrollContainer.clientHeight, 0);
		const accelerationProgress = Math.min(
			((time - startTime) / 1000) / accelerationDuration,
			1,
		);
		const rampFactor = easeInOutSine(accelerationProgress);
		const smoothingFactor = smooth ? 0.18 : 0.28;
		const speedFactor = smooth ? 1 : 1.25;
		
		// Micro-variation for natural scroll
		const microVariation = 1 + (Math.sin(time / 1000) * 0.02);
		
		// Fade-out in last 200px
		const distanceFromEnd = maxScroll - scrollContainer.scrollTop;
		const fadeOutFactor = distanceFromEnd < 200 ? distanceFromEnd / 200 : 1;
		
		currentSpeed += (targetSpeed - currentSpeed) * smoothingFactor;
		const step = currentSpeed * speedFactor * rampFactor * microVariation * fadeOutFactor * delta;

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
		// Gradual deceleration
		const decelerate = () => {
			if (currentSpeed > 5) {
				currentSpeed *= 0.85;
				scrollContainer.scrollTop += (currentSpeed * 0.016);
				requestAnimationFrame(decelerate);
			} else {
				currentSpeed = 0;
			}
		};
		
		isPlaying = false;
		cancelCountdown();
		if (raf) cancelAnimationFrame(raf);
		raf = null;
		
		if (currentSpeed > 10) {
			decelerate();
		}
		
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
		const maxScroll = content.scrollHeight - scrollContainer.clientHeight;
		const next = scrollContainer.scrollTop + amount;
		scrollContainer.scrollTop = clamp(next, 0, maxScroll);
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
		if (!isPlaying) {
			// Allow manual scroll when paused
			return;
		}
		event.preventDefault();
		// Adjust speed with wheel when playing
		const delta = event.deltaY > 0 ? -4 : 4;
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
			
			// Auto-save current script
			if (currentScript && text.trim()) {
				saveCurrentScript();
			}
		}, 300);
	};

	// Script history functions
	interface SavedScript {
		id: string;
		name: string;
		text: string;
		createdAt: string;
		updatedAt: string;
	}

	const getScripts = (): SavedScript[] => {
		try {
			const raw = localStorage.getItem("teleprompter:scripts");
			return raw ? JSON.parse(raw) : [];
		} catch {
			return [];
		}
	};

	const saveScripts = (scripts: SavedScript[]) => {
		localStorage.setItem("teleprompter:scripts", JSON.stringify(scripts));
	};

	const saveCurrentScript = () => {
		if (!text.trim()) return;
		const scripts = getScripts();
		const now = new Date().toISOString();
		
		if (currentScript) {
			const index = scripts.findIndex(s => s.id === currentScript);
			if (index >= 0) {
				scripts[index].text = text;
				scripts[index].updatedAt = now;
			}
		} else {
			const newScript: SavedScript = {
				id: Date.now().toString(),
				name: `Guion ${scripts.length + 1}`,
				text,
				createdAt: now,
				updatedAt: now,
			};
			scripts.unshift(newScript);
			currentScript = newScript.id;
			
			// Keep max 20 scripts
			if (scripts.length > 20) {
				scripts.splice(20);
			}
		}
		
		saveScripts(scripts);
		localStorage.setItem("teleprompter:lastScript", currentScript!);
	};

	const loadScript = (id: string) => {
		const scripts = getScripts();
		const script = scripts.find(s => s.id === id);
		if (script) {
			text = script.text;
			currentScript = id;
			localStorage.setItem("teleprompter:lastScript", id);
		}
	};

	const deleteScript = (id: string) => {
		const scripts = getScripts().filter(s => s.id !== id);
		saveScripts(scripts);
		if (currentScript === id) {
			currentScript = null;
			text = "";
		}
	};

	const newScript = () => {
		currentScript = null;
		text = "";
	};

	const getSpeedLabel = (spd: number): string => {
		if (spd < 60) return "Lento";
		if (spd < 120) return "Normal";
		if (spd < 200) return "Rápido";
		return "Muy rápido";
	};

	const getStatus = (): string => {
		if (isPlaying) return "Reproduciendo...";
		if (isCountingDown) return "Iniciando...";
		if (progress >= 0.99) return "Finalizado";
		if (progress > 0) return "Pausado";
		return "Listo";
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

	$: if (isReady && (text || speed || fontSize || lineHeight || isMirror || autoCenter || smooth || glow || focusMode || dimOutside || ultraClean)) {
		scheduleSave();
	}

	onMount(() => {
		window.addEventListener("keydown", onKey);
		const mql = window.matchMedia("(max-width: 768px)");
		isMobile = mql.matches;
		// Only show mobile notice on mobile devices if user hasn't dismissed it
		const dismissedMobile = localStorage.getItem("teleprompter:mobile:dismissed");
		showMobileNotice = isMobile && !dismissedMobile;
		allowMobile = !showMobileNotice;

		applyStoredThemeToDocument();
		stopThemeWatch = watchSystemThemeChanges(getStoredTheme());

		loadState();
		
		// Load last used script
		const lastScriptId = localStorage.getItem("teleprompter:lastScript");
		if (lastScriptId) {
			loadScript(lastScriptId);
		}
		
		// Check for onboarding
		const onboardingDone = localStorage.getItem("teleprompter:onboarding:done");
		if (!onboardingDone) {
			showOnboarding = true;
		}
		
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
					<button class="btn-regular" on:click={() => {
						allowMobile = true;
						localStorage.setItem("teleprompter:mobile:dismissed", "true");
					}}>Continuar</button>
					<a class="btn-plain" href="/herramientas/">Volver</a>
				</div>
			</div>
		</div>
	{/if}

	{#if showOnboarding}
		<div class="teleprompter-onboarding-overlay">
			<div class="teleprompter-onboarding-card">
				<div class="onboarding-step">
					<div class="step-icon">📝</div>
					<h3>Pega tu guion</h3>
					<p>Escribe o pega el texto que deseas leer en el área de texto</p>
				</div>
				<div class="onboarding-step">
					<div class="step-icon">⚙️</div>
					<h3>Ajusta a tu ritmo</h3>
					<p>Personaliza velocidad, tamaño y otras opciones según tu preferencia</p>
				</div>
				<div class="onboarding-step">
					<div class="step-icon">▶️</div>
					<h3>Empieza a grabar</h3>
					<p>Presiona Play o Espacio para comenzar la lectura profesional</p>
				</div>
				<button class="btn-onboarding" on:click={() => {
					showOnboarding = false;
					localStorage.setItem("teleprompter:onboarding:done", "true");
				}}>Entendido</button>
			</div>
		</div>
	{/if}

	<div class="teleprompter-header">
		<div>
			<h1 class="teleprompter-title">Teleprompter</h1>
			<p class="teleprompter-subtitle">Tu estudio de lectura profesional</p>
			<p class="teleprompter-status">{getStatus()}</p>
		</div>
		<div class="teleprompter-header-actions">
			<button class="btn-plain" on:click={() => (showOnboarding = true)} title="Ver tutorial">
				?
			</button>
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
		<div class="script-manager">
			<label for="script-selector">Guion guardado:</label>
			<div class="script-controls">
				<select id="script-selector" bind:value={currentScript} on:change={(e) => {
					const id = (e.target as HTMLSelectElement).value;
					if (id) loadScript(id);
				}}>
					<option value="">-- Nuevo guion --</option>
					{#each getScripts() as script}
						<option value={script.id}>{script.name}</option>
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
			class="teleprompter-input"
			bind:value={text}
			rows={6}
			placeholder="Escribe o pega aquí tu guion..."
		></textarea>

		{#if showControls}
			<div class="teleprompter-controls">
				<div class="control-group">
					<label title="Velocidad ideal: 40-80 px/seg para lectura natural">Velocidad <span class="speed-label">({getSpeedLabel(speed)})</span></label>
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
						<button class:active={isMirror} on:click={() => (isMirror = !isMirror)} title="Activa para cámaras frontales que invierten la imagen">Espejo (M)</button>
						<button class:active={autoCenter} on:click={() => (autoCenter = !autoCenter)} title="Mantiene el texto centrado en la pantalla">Auto-centrar</button>
						<button class:active={smooth} on:click={() => (smooth = !smooth)} title="Transición suave entre velocidades">Suave</button>
						<button class:active={glow} on:click={() => (glow = !glow)} title="Efecto de brillo en la pantalla">Glow</button>
						<button class:active={focusMode} on:click={() => (focusMode = !focusMode)} title="Resalta la línea actual y oscurece el resto">Focus (F)</button>
						<button class:active={dimOutside} on:click={() => (dimOutside = !dimOutside)}>Oscurecer bordes</button>
						<button class:active={ultraClean} on:click={() => (ultraClean = !ultraClean)} title="Oculta todos los controles para máxima concentración">Ultra limpio (L)</button>
					</div>
				</div>
				<div class="control-actions">
					<button class="btn-play" on:click={toggle}>{isPlaying ? "⏸ Pausar" : isCountingDown ? "⏹ Cancelar" : "▶ Reproducir"}</button>
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
		class:is-fullscreen={isFullscreen}
		bind:this={fullscreenTarget}
	>
		<div class="teleprompter-progress">
			<div class="bar" style={`width: ${progress * 100}%`}></div>
		</div>
		<div
			class="teleprompter-frame"
			bind:this={scrollContainer}
			on:wheel={handleWheel}
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
		
		/* Onboarding overlay */
		.teleprompter-onboarding-overlay {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.7);
			backdrop-filter: blur(8px);
			z-index: 50;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 1.5rem;
		}
		.teleprompter-onboarding-card {
			max-width: 640px;
			background: rgba(255, 255, 255, 0.95);
			border-radius: 1.5rem;
			padding: 2.5rem;
			box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4);
			border: 1px solid rgba(255, 255, 255, 0.2);
			display: grid;
			gap: 1.5rem;
		}
		:global(.dark) .teleprompter-onboarding-card {
			background: rgba(15, 23, 42, 0.95);
			border-color: rgba(148, 163, 184, 0.2);
		}
		.onboarding-step {
			display: flex;
			flex-direction: column;
			align-items: center;
			text-align: center;
			gap: 0.5rem;
		}
		.step-icon {
			font-size: 2.5rem;
			margin-bottom: 0.5rem;
		}
		.onboarding-step h3 {
			font-size: 1.25rem;
			font-weight: 700;
			color: inherit;
		}
		.onboarding-step p {
			color: inherit;
			opacity: 0.8;
		}
		.btn-onboarding {
			background: linear-gradient(135deg, #6366f1, #0ea5e9);
			color: white;
			border: none;
			border-radius: 0.75rem;
			padding: 0.85rem 2rem;
			font-weight: 700;
			font-size: 1.05rem;
			cursor: pointer;
			transition: transform 0.2s ease, box-shadow 0.2s ease;
			box-shadow: 0 8px 20px rgba(99, 102, 241, 0.35);
		}
		.btn-onboarding:hover {
			transform: translateY(-2px);
			box-shadow: 0 12px 28px rgba(99, 102, 241, 0.45);
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
			color: inherit;
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
			background: linear-gradient(135deg, #6366f1, #0ea5e9);
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
			background-clip: text;
		}
		.teleprompter-subtitle {
			color: inherit;
			opacity: 0.7;
			font-size: 1rem;
		}
		.teleprompter-status {
			color: inherit;
			opacity: 0.6;
			font-size: 0.9rem;
			font-weight: 600;
			margin-top: 0.25rem;
		}
		.speed-label {
			font-weight: 400;
			opacity: 0.8;
		}
		.teleprompter-panel {
			background: var(--card-bg);
			border-radius: 1.25rem;
			padding: 1.5rem;
			box-shadow: 0 18px 60px rgba(15, 23, 42, 0.15);
			color: inherit;
		}
		.script-manager {
			display: grid;
			gap: 0.5rem;
			margin-bottom: 1rem;
		}
		.script-manager label {
			font-weight: 600;
			color: inherit;
		}
		.script-controls {
			display: flex;
			gap: 0.5rem;
			align-items: center;
		}
		.script-controls select {
			flex: 1;
			padding: 0.5rem;
			border-radius: 0.5rem;
			border: 1px solid rgba(15, 23, 42, 0.15);
			background: rgba(255, 255, 255, 0.7);
			color: inherit;
			font-size: 0.95rem;
		}
		:global(.dark) .script-controls select {
			background: rgba(15, 23, 42, 0.5);
			border-color: rgba(255, 255, 255, 0.1);
			color: white;
		}
		.btn-icon {
			border: none;
			background: rgba(99, 102, 241, 0.15);
			border-radius: 0.5rem;
			padding: 0.5rem 0.75rem;
			cursor: pointer;
			transition: all 0.2s ease;
			font-size: 1rem;
		}
		.btn-icon:hover {
			background: rgba(99, 102, 241, 0.25);
			transform: translateY(-1px);
		}
		:global(.dark) .btn-icon {
			background: rgba(99, 102, 241, 0.25);
		}
		:global(.dark) .btn-icon:hover {
			background: rgba(99, 102, 241, 0.35);
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
			color: #e2e8f0;
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
		}
		:global(.dark) .control-group label {
			color: #e2e8f0;
		}
		.control-group span {
			font-size: 0.85rem;
			color: inherit;
			opacity: 0.7;
		}
		:global(.dark) .control-group span {
			color: #e2e8f0;
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
			color: #0f172a;
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
			color: #e2e8f0;
		}
		:global(.dark) .toggle-grid button.active {
			background: rgba(99,102,241, 0.3);
			border-color: rgba(99,102,241, 0.7);
		}
		.control-actions {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
		}
		.btn-play {
			background: linear-gradient(135deg, #6366f1, #0ea5e9);
			color: white;
			border: none;
			border-radius: 0.75rem;
			padding: 0.75rem 1.5rem;
			font-weight: 700;
			cursor: pointer;
			transition: transform 0.2s ease, box-shadow 0.2s ease;
			box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
		}
		.btn-play:hover {
			transform: translateY(-2px);
			box-shadow: 0 10px 24px rgba(99, 102, 241, 0.4);
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
			color: #e2e8f0;
		}
		:global(.dark) .teleprompter-screen::before {
			background: radial-gradient(circle at top, rgba(99, 102, 241, 0.18), transparent 55%),
				radial-gradient(circle at bottom, rgba(14, 165, 233, 0.12), transparent 60%);
			opacity: 0.6;
		}
		.teleprompter-screen.glow {
			box-shadow: 0 20px 120px rgba(99,102,241,0.25);
		}
		.teleprompter-screen.is-fullscreen {
			width: 100vw;
			height: 100vh;
			border-radius: 0;
			background: #f8fafc;
			color: #0f172a;
		}
		:global(.dark) .teleprompter-screen.is-fullscreen {
			background: #050816;
			color: #e2e8f0;
		}
		.teleprompter-screen.is-fullscreen .teleprompter-frame {
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
		}
		.btn-float:hover {
			transform: translateY(-2px);
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
		:global(.dark) .teleprompter-footer {
			color: #e2e8f0;
		}
		.shortcut {
			font-weight: 500;
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
