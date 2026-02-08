<script lang="ts">
	import { onDestroy, onMount } from "svelte";

	let text = `Pega aquí tu guion...\n\nTip: Usa párrafos cortos para una lectura más cómoda.`;
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

	let scrollContainer: HTMLDivElement;
	let content: HTMLDivElement;
	let raf: number | null = null;
	let lastTime = 0;
	let observer: IntersectionObserver | null = null;

	const clamp = (value: number, min: number, max: number) =>
		Math.min(Math.max(value, min), max);

	const updateProgress = () => {
		if (!scrollContainer || !content) return;
		const maxScroll = content.scrollHeight - scrollContainer.clientHeight;
		progress = maxScroll <= 0 ? 0 : clamp(scrollContainer.scrollTop / maxScroll, 0, 1);
	};

	const tick = (time: number) => {
		if (!isPlaying) return;
		if (!lastTime) lastTime = time;
		const delta = (time - lastTime) / 1000;
		lastTime = time;

		const factor = smooth ? 1 : 1.35;
		scrollContainer.scrollTop += speed * delta * factor;
		updateProgress();

		const maxScroll = content.scrollHeight - scrollContainer.clientHeight;
		if (scrollContainer.scrollTop >= maxScroll) {
			isPlaying = false;
			return;
		}
		raf = requestAnimationFrame(tick);
	};

	const start = () => {
		if (!isPlaying) {
			isPlaying = true;
			lastTime = 0;
			raf = requestAnimationFrame(tick);
		}
	};

	const pause = () => {
		isPlaying = false;
		if (raf) cancelAnimationFrame(raf);
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
		scrollContainer.scrollTop = 0;
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

	const onKey = (event: KeyboardEvent) => {
		if (event.target && (event.target as HTMLElement).tagName === "TEXTAREA") return;
		switch (event.code) {
			case "Space":
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
			case "KeyM":
				isMirror = !isMirror;
				break;
			case "KeyF":
				focusMode = !focusMode;
				break;
			case "KeyR":
				reset();
				break;
		}
	};

	onMount(() => {
		window.addEventListener("keydown", onKey);
		updateProgress();
		observer = new IntersectionObserver(() => updateProgress());
		observer.observe(scrollContainer);
	});

	onDestroy(() => {
		window.removeEventListener("keydown", onKey);
		pause();
		observer?.disconnect();
	});
</script>

<div class="teleprompter-wrapper">
	<div class="teleprompter-header">
		<div>
			<h1 class="teleprompter-title">Teleprompter</h1>
			<p class="teleprompter-subtitle">Lectura fluida y profesional para tus guiones.</p>
		</div>
		<button class="btn-plain teleprompter-toggle" on:click={() => (showControls = !showControls)}>
			{showControls ? "Ocultar controles" : "Mostrar controles"}
		</button>
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
				<div class="control-group toggles">
					<label>Opciones</label>
					<div class="toggle-grid">
						<button class:active={isMirror} on:click={() => (isMirror = !isMirror)}>Espejo (M)</button>
						<button class:active={autoCenter} on:click={() => (autoCenter = !autoCenter)}>Auto-centrar</button>
						<button class:active={smooth} on:click={() => (smooth = !smooth)}>Suave</button>
						<button class:active={glow} on:click={() => (glow = !glow)}>Glow</button>
						<button class:active={focusMode} on:click={() => (focusMode = !focusMode)}>Focus (F)</button>
						<button class:active={dimOutside} on:click={() => (dimOutside = !dimOutside)}>Oscurecer bordes</button>
					</div>
				</div>
				<div class="control-actions">
					<button class="btn-regular" on:click={toggle}>{isPlaying ? "Pausar" : "Reproducir"}</button>
					<button class="btn-plain" on:click={reset}>Reiniciar (R)</button>
					<button class="btn-plain" on:click={() => jump(-240)}>↑</button>
					<button class="btn-plain" on:click={() => jump(240)}>↓</button>
				</div>
			</div>
		{/if}
	</div>

	<div class="teleprompter-screen" class:mirror={isMirror} class:focus={focusMode} class:glow={glow}>
		<div class="teleprompter-progress">
			<div class="bar" style={`width: ${progress * 100}%`}></div>
		</div>
		<div class="teleprompter-frame" bind:this={scrollContainer} on:scroll={updateProgress}>
			<div
				class="teleprompter-content"
				style={`font-size:${fontSize}px; line-height:${lineHeight};`}
				bind:this={content}
			>
				{#each text.split("\n") as line}
					<p>{line}</p>
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
			<button class="btn-float" on:click={toggle}>{isPlaying ? "⏸" : "▶"}</button>
			<button class="btn-float" on:click={() => jump(-120)}>↑</button>
			<button class="btn-float" on:click={() => jump(120)}>↓</button>
			<button class="btn-float" on:click={() => (isMirror = !isMirror)}>M</button>
		</div>
	</div>

	<div class="teleprompter-footer">
		<div class="shortcut">Espacio = Play/Pausa · ↑/↓ = Saltos · M = Espejo · F = Focus · R = Reset</div>
	</div>
</div>

<style>
	.teleprompter-wrapper {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.teleprompter-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.teleprompter-title {
		font-size: 2rem;
		font-weight: 700;
	}
	.teleprompter-subtitle {
		color: rgba(0,0,0,0.6);
	}
	:global(.dark) .teleprompter-subtitle {
		color: rgba(255,255,255,0.6);
	}
	.teleprompter-panel {
		background: var(--card-bg);
		border-radius: 1.25rem;
		padding: 1.5rem;
		box-shadow: 0 18px 60px rgba(15, 23, 42, 0.15);
	}
	.teleprompter-input {
		width: 100%;
		border-radius: 1rem;
		padding: 1rem;
		background: rgba(255,255,255,0.7);
		border: 1px solid rgba(15, 23, 42, 0.1);
		min-height: 140px;
		font-size: 1rem;
	}
	:global(.dark) .teleprompter-input {
		background: rgba(15,23,42,0.5);
		border-color: rgba(255,255,255,0.1);
		color: white;
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
	}
	.control-group span {
		font-size: 0.85rem;
		color: rgba(0,0,0,0.6);
	}
	:global(.dark) .control-group span {
		color: rgba(255,255,255,0.6);
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
	}
	.toggle-grid button.active {
		background: rgba(99, 102, 241, 0.2);
		border-color: rgba(99, 102, 241, 0.6);
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
	}
	:global(.dark) .teleprompter-screen {
		background: radial-gradient(circle at top, rgba(15,23,42,0.8), rgba(2,6,23,0.85));
		border-color: rgba(255,255,255,0.1);
	}
	.teleprompter-screen.glow {
		box-shadow: 0 20px 120px rgba(99,102,241,0.25);
	}
	.teleprompter-progress {
		height: 4px;
		background: rgba(99, 102, 241, 0.1);
	}
	.teleprompter-progress .bar {
		height: 100%;
		background: linear-gradient(90deg, rgba(99, 102, 241, 0.8), rgba(14, 165, 233, 0.9));
		transition: width 0.2s ease;
	}
	.teleprompter-frame {
		height: 420px;
		overflow-y: auto;
		padding: 2.5rem 2rem;
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
		color: rgba(0,0,0,0.6);
	}
	:global(.dark) .teleprompter-footer {
		color: rgba(255,255,255,0.6);
	}
	.shortcut {
		font-weight: 500;
	}
	@media (max-width: 768px) {
		.teleprompter-header {
			flex-direction: column;
			align-items: flex-start;
		}
		.teleprompter-frame {
			height: 320px;
			padding: 1.5rem;
		}
		.teleprompter-float {
			right: 1rem;
			bottom: 1rem;
		}
	}
</style>
