<script lang="ts">
import { onDestroy, onMount } from "svelte";
import {
applyStoredThemeToDocument,
getStoredTheme,
watchSystemThemeChanges,
} from "@utils/setting-utils.ts";

const storageKey = "teleprompter:state:v3";

// Core state
let text = `Pega aquí tu guion...

Tip: Usa párrafos cortos para una lectura más cómoda.`;
let speed = 60; // px/seg - now corresponds to actual speed
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
let currentScript: string | null = null;
let countdownDuration = 3; // Configurable: 0, 1, 2, 3, 5

// Dark mode reactive detection
let isDark = false;

// DOM references
let scrollContainer: HTMLDivElement;
let content: HTMLDivElement;
let fullscreenTarget: HTMLDivElement;
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

// Speed range: 10-400 px/s (10 = very slow but visible, 400 = very fast)
const speedMin = 10;
const speedMax = 400;
let targetSpeed = speed;
let currentSpeed = 0;

const clamp = (value: number, min: number, max: number) =>
Math.min(Math.max(value, min), max);

$: lines = text.split("\n");
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

// Professional time-based scroll engine
const tick = (timestamp: number) => {
if (!isPlaying || !scrollContainer || !content) {
raf = null;
lastTime = null;
return;
}

if (!lastTime) {
lastTime = timestamp;
raf = requestAnimationFrame(tick);
return;
}

const delta = Math.min((timestamp - lastTime) / 1000, 0.1); // seconds, cap at 100ms
lastTime = timestamp;

// Smooth exponential interpolation towards target speed
const lerpFactor = 1 - Math.pow(0.001, delta);
currentSpeed = currentSpeed + (targetSpeed - currentSpeed) * lerpFactor;

// Micro-variation for organic feel (±1.5%)
const variation = 1 + Math.sin(timestamp * 0.001) * 0.015;

// Fade-out in last 300px
const maxScroll = content.scrollHeight - scrollContainer.clientHeight;
const remaining = maxScroll - scrollContainer.scrollTop;
const fadeFactor = remaining < 300 ? Math.max(remaining / 300, 0.05) : 1;

// Calculate real step
const step = currentSpeed * variation * fadeFactor * delta;

scrollContainer.scrollTop = Math.min(scrollContainer.scrollTop + step, maxScroll);
updateProgress();

if (scrollContainer.scrollTop >= maxScroll) {
isPlaying = false;
raf = null;
lastTime = null;
return;
}

raf = requestAnimationFrame(tick);
};

const startPlayback = () => {
if (!scrollContainer || !content) return;
if (raf) cancelAnimationFrame(raf);
speed = clamp(speed, speedMin, speedMax);
targetSpeed = speed;
currentSpeed = speed * 0.1; // Start from 10% of target for smooth start
isPlaying = true;
lastTime = null;
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
isPlaying = false;
cancelCountdown();
if (raf) {
cancelAnimationFrame(raf);
raf = null;
}
lastTime = null;
// Smooth deceleration
if (currentSpeed > 5 && scrollContainer) {
const decelerate = () => {
if (currentSpeed > 5) {
currentSpeed *= 0.85;
scrollContainer.scrollTop += currentSpeed * 0.016;
requestAnimationFrame(decelerate);
} else {
currentSpeed = 0;
}
};
decelerate();
} else {
currentSpeed = 0;
}
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
const maxScroll = content.scrollHeight - scrollContainer.clientHeight;
const next = scrollContainer.scrollTop + amount;
scrollContainer.scrollTop = clamp(next, 0, maxScroll);
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
// Fixed: scroll down (deltaY > 0) should increase speed
const delta = event.deltaY > 0 ? 4 : -4;
adjustSpeed(delta);
};

const adjustSpeed = (amount: number) => {
speed = clamp(speed + amount, speedMin, speedMax);
targetSpeed = speed;
// Update currentSpeed smoothly through the tick loop
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
countdownDuration: number;
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
if (typeof data.countdownDuration === "number") countdownDuration = data.countdownDuration;
speed = clamp(speed, speedMin, speedMax);
targetSpeed = speed;
currentSpeed = 0;
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
countdownDuration,
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

let scripts: SavedScript[] = [];

const loadScripts = () => {
try {
const raw = localStorage.getItem("teleprompter:scripts");
scripts = raw ? JSON.parse(raw) : [];
} catch {
scripts = [];
}
};

const saveScripts = (scriptsToSave: SavedScript[]) => {
localStorage.setItem("teleprompter:scripts", JSON.stringify(scriptsToSave));
scripts = scriptsToSave;
};

const saveCurrentScript = () => {
if (!text.trim()) return;
const now = new Date().toISOString();

if (currentScript) {
const index = scripts.findIndex((s) => s.id === currentScript);
if (index >= 0) {
scripts[index].text = text;
scripts[index].updatedAt = now;
saveScripts(scripts);
}
} else {
const newScript: SavedScript = {
id: Date.now().toString(),
name: `Guion ${scripts.length + 1}`,
text,
createdAt: now,
updatedAt: now,
};
const updated = [newScript, ...scripts];

// Keep max 20 scripts
if (updated.length > 20) {
updated.splice(20);
}

saveScripts(updated);
currentScript = newScript.id;
localStorage.setItem("teleprompter:lastScript", currentScript);
}
};

const loadScript = (id: string) => {
const script = scripts.find((s) => s.id === id);
if (script) {
text = script.text;
currentScript = id;
localStorage.setItem("teleprompter:lastScript", id);
}
};

const deleteScript = (id: string) => {
const updated = scripts.filter((s) => s.id !== id);
saveScripts(updated);
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
if (spd < 40) return "Muy lento";
if (spd < 80) return "Lento";
if (spd < 150) return "Normal";
if (spd < 250) return "Rápido";
return "Muy rápido";
};

const getStatus = (): string => {
if (isPlaying) return "Reproduciendo...";
if (isCountingDown) return "Iniciando...";
if (progress >= 0.99) return "Finalizado";
if (progress > 0) return "Pausado";
return "Listo";
};

const getStatusColor = (): string => {
if (isPlaying) return "oklch(0.60 0.15 220)"; // blue
if (isCountingDown) return "oklch(0.65 0.15 60)"; // yellow
if (progress >= 0.99) return "oklch(0.50 0.05 var(--hue))"; // gray
return "oklch(0.60 0.15 150)"; // green
};

const getSpeedColor = (): string => {
const ratio = (speed - speedMin) / (speedMax - speedMin);
if (ratio < 0.33) return "oklch(0.65 0.15 150)"; // green
if (ratio < 0.66) return "oklch(0.70 0.15 60)"; // yellow
return "oklch(0.65 0.18 25)"; // red
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

const getEstimatedTimeRemaining = (): string => {
if (!scrollContainer || !content || speed === 0) return "";
const maxScroll = content.scrollHeight - scrollContainer.clientHeight;
const remaining = maxScroll - scrollContainer.scrollTop;
if (remaining <= 0) return "0s";
const seconds = Math.ceil(remaining / speed);
if (seconds < 60) return `${seconds}s`;
const minutes = Math.floor(seconds / 60);
const secs = seconds % 60;
return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

const onKey = (event: KeyboardEvent) => {
if (event.target && (event.target as HTMLElement).tagName === "TEXTAREA") return;
switch (event.code) {
case "Space":
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

onMount(() => {
// Dark mode detection with MutationObserver
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
const dismissedMobile = localStorage.getItem("teleprompter:mobile:dismissed");
showMobileNotice = isMobile && !dismissedMobile;
allowMobile = !showMobileNotice;

applyStoredThemeToDocument();
stopThemeWatch = watchSystemThemeChanges(getStoredTheme());

loadState();
loadScripts();

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
darkModeObserver?.disconnect();
if (saveTimeout) clearTimeout(saveTimeout);
stopThemeWatch?.();
stopThemeWatch = null;
if (countdownTimer) clearInterval(countdownTimer);
});
</script>

<div class="teleprompter-wrapper" class:clean={ultraClean} class:dark={isDark}>
{#if showMobileNotice && !allowMobile}
<div class="teleprompter-mobile-overlay">
<div class="teleprompter-mobile-card">
<h2>Teleprompter recomendado para PC</h2>
<p>
Esta herramienta está optimizada para pantallas grandes. Puedes continuar en móvil,
pero la experiencia será limitada.
</p>
<div class="teleprompter-mobile-actions">
<button
class="btn-regular"
on:click={() => {
allowMobile = true;
localStorage.setItem("teleprompter:mobile:dismissed", "true");
}}>Continuar</button
>
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
<button
class="btn-onboarding"
on:click={() => {
showOnboarding = false;
localStorage.setItem("teleprompter:onboarding:done", "true");
}}>Entendido</button
>
</div>
</div>
{/if}

<div class="teleprompter-header">
<div>
<h1 class="teleprompter-title">Teleprompter</h1>
<p class="teleprompter-subtitle">Tu estudio de lectura profesional</p>
<div class="status-row">
<div class="status-indicator" style={`background-color: ${getStatusColor()}`}></div>
<p class="teleprompter-status">{getStatus()}</p>
</div>
</div>
<div class="teleprompter-header-actions">
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
{isFullscreen ? "Salir pantalla completa" : "Pantalla completa (X)"}
</button>
<button class="btn-plain" class:active={ultraClean} on:click={() => (ultraClean = !ultraClean)}>
{ultraClean ? "Salir modo limpio" : "Modo limpio (L)"}
</button>
</div>
</div>

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
{script.name} · {formatRelativeTime(script.updatedAt)}
</option>
{/each}
</select>
<button class="btn-icon" on:click={saveCurrentScript} title="Guardar guion actual"
>💾</button
>
<button class="btn-icon" on:click={newScript} title="Nuevo guion">➕</button>
{#if currentScript}
<button
class="btn-icon"
on:click={() => deleteScript(currentScript!)}
title="Eliminar guion">🗑️</button
>
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
<div class="controls-grid">
<div class="control-group">
<div class="control-label-row">
<label title="Velocidad ideal: 40-80 px/seg para lectura natural"
>Velocidad</label
>
<span class="speed-label">{getSpeedLabel(speed)}</span>
</div>
<input
type="range"
class="custom-range"
min={speedMin}
max={speedMax}
bind:value={speed}
/>
<div class="control-value-row">
<span class="control-value">{speed} px/seg</span>
<div
class="speed-indicator-bar"
style={`width: ${((speed - speedMin) / (speedMax - speedMin)) * 100}%; background-color: ${getSpeedColor()}`}
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
on:click={() => (isMirror = !isMirror)}
title="Activa para cámaras frontales que invierten la imagen"
>Espejo (M)</button
>
<button
class="toggle-btn"
class:active={autoCenter}
on:click={() => (autoCenter = !autoCenter)}
title="Mantiene el texto centrado en la pantalla">Auto-centrar</button
>
<button
class="toggle-btn"
class:active={smooth}
on:click={() => (smooth = !smooth)}
title="Transición suave entre velocidades">Suave</button
>
<button
class="toggle-btn"
class:active={glow}
on:click={() => (glow = !glow)}
title="Efecto de brillo en la pantalla">Glow</button
>
<button
class="toggle-btn"
class:active={focusMode}
on:click={() => (focusMode = !focusMode)}
title="Resalta la línea actual y oscurece el resto">Focus (F)</button
>
<button
class="toggle-btn"
class:active={dimOutside}
on:click={() => (dimOutside = !dimOutside)}>Oscurecer bordes</button
>
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

<div
class="teleprompter-screen"
class:mirror={isMirror}
class:focus={focusMode}
class:glow={glow}
class:is-fullscreen={isFullscreen}
bind:this={fullscreenTarget}
>
<div class="teleprompter-progress-top">
<div class="progress-bar" style={`width: ${progress * 100}%`}></div>
{#if isPlaying || progress > 0}
<div class="time-remaining">{getEstimatedTimeRemaining()}</div>
{/if}
</div>

<div class="reading-position-marker"></div>

<div
class="teleprompter-frame"
bind:this={scrollContainer}
on:wheel={handleWheel}
style={`padding: ${autoCenter ? "35vh 2rem" : "2.5rem 2rem"};`}
>
<div
class="teleprompter-content"
style={`font-size:${fontSize}px; line-height:${lineHeight}; letter-spacing: 0.01em;`}
bind:this={content}
>
{#each lines as line, index}
<p
class:active={index === activeLineIndex}
class:dimmed={focusMode && index !== activeLineIndex}
bind:this={lineElements[index]}
>
{line}
</p>
{/each}
</div>
</div>

{#if focusMode && dimOutside}
<div class="teleprompter-dim"></div>
{/if}

<div class="teleprompter-float">
<button class="btn-float" on:click={toggle} title={isPlaying ? "Pausar" : "Reproducir"}>
{isPlaying ? "⏸" : isCountingDown ? "⏹" : "▶"}
</button>
<button class="btn-float" on:click={() => jump(-120)} title="Saltar arriba">↑</button>
<button class="btn-float" on:click={() => jump(120)} title="Saltar abajo">↓</button>
{#if isFullscreen}
<div class="float-speed-control">
<input
type="range"
class="mini-range"
min={speedMin}
max={speedMax}
bind:value={speed}
/>
<span class="mini-speed">{speed}</span>
</div>
{/if}
<button class="btn-float" on:click={() => (isMirror = !isMirror)} title="Espejo"
>M</button
>
<button class="btn-float" on:click={toggleFullscreen} title="Pantalla completa"
>⛶</button
>
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
/* Base wrapper with dark mode support */
.teleprompter-wrapper {
display: flex;
flex-direction: column;
gap: 1.5rem;
position: relative;
color: #0f172a;
transition: all 0.3s ease;
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

/* Mobile overlay */
.teleprompter-mobile-overlay {
position: fixed;
inset: 0;
background: rgba(0, 0, 0, 0.7);
backdrop-filter: blur(8px);
z-index: 50;
display: flex;
align-items: center;
justify-content: center;
padding: 1.5rem;
animation: fadeIn 0.3s ease;
}

.teleprompter-mobile-card {
max-width: 420px;
background: rgba(255, 255, 255, 0.98);
border-radius: 1.25rem;
padding: 1.5rem;
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
border: 1px solid rgba(255, 255, 255, 0.3);
animation: scaleIn 0.3s ease;
}

:global(.dark) .teleprompter-mobile-card,
.dark .teleprompter-mobile-card {
background: rgba(15, 23, 42, 0.98);
border-color: rgba(148, 163, 184, 0.2);
}

.teleprompter-mobile-card h2 {
font-size: 1.2rem;
margin-bottom: 0.5rem;
color: #0f172a;
}

:global(.dark) .teleprompter-mobile-card h2,
.dark .teleprompter-mobile-card h2 {
color: #e2e8f0;
}

.teleprompter-mobile-card p {
color: #334155;
margin-bottom: 1rem;
line-height: 1.5;
}

:global(.dark) .teleprompter-mobile-card p,
.dark .teleprompter-mobile-card p {
color: #cbd5e1;
}

.teleprompter-mobile-actions {
display: flex;
gap: 0.75rem;
flex-wrap: wrap;
}

/* Onboarding overlay */
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

/* Panel */
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

/* Controls */
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

/* Custom range input */
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

/* Toggles */
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

/* Action buttons */
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
min-height: unset;
}

.teleprompter-screen.mirror {
transform: scaleX(-1);
}

/* Progress bar at top */
.teleprompter-progress-top {
position: absolute;
top: 0;
left: 0;
right: 0;
height: 3px;
background: rgba(0, 0, 0, 0.1);
z-index: 10;
}

:global(.dark) .teleprompter-progress-top,
.dark .teleprompter-progress-top {
background: rgba(255, 255, 255, 0.1);
}

.progress-bar {
height: 100%;
background: linear-gradient(90deg, oklch(0.70 0.14 var(--hue)), oklch(0.65 0.16 calc(var(--hue) + 60)));
transition: width 0.3s ease;
box-shadow: 0 0 10px oklch(0.70 0.14 var(--hue) / 0.5);
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
}

/* Reading position marker */
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

/* Frame and content */
.teleprompter-frame {
height: 100%;
overflow-y: auto;
overflow-x: hidden;
scroll-behavior: smooth;
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

.teleprompter-content {
color: #0f172a;
text-align: center;
user-select: none;
transition: all 0.3s ease;
}

:global(.dark) .teleprompter-content,
.dark .teleprompter-content {
color: #f1f5f9;
}

.teleprompter-content p {
margin: 0.75rem 0;
padding: 0.5rem 1rem;
transition: all 0.3s ease;
border-radius: 0.5rem;
line-height: inherit;
}

.teleprompter-content p.active {
background: rgba(0, 0, 0, 0.03);
border-left: 4px solid oklch(0.70 0.14 var(--hue));
padding-left: calc(1rem - 4px);
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

:global(.dark) .teleprompter-content p.active,
.dark .teleprompter-content p.active {
background: rgba(255, 255, 255, 0.05);
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.teleprompter-screen.focus .teleprompter-content p.dimmed {
opacity: 0.3;
}

/* Dim overlay for focus mode */
.teleprompter-dim {
position: absolute;
inset: 0;
background: radial-gradient(
ellipse at center,
transparent 20%,
rgba(0, 0, 0, 0.6) 70%
);
pointer-events: none;
z-index: 4;
}

:global(.dark) .teleprompter-dim,
.dark .teleprompter-dim {
background: radial-gradient(
ellipse at center,
transparent 20%,
rgba(0, 0, 0, 0.8) 70%
);
}

/* Floating controls */
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

/* Footer */
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

/* Countdown */
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

@keyframes pulse {
0%,
100% {
opacity: 1;
}
50% {
opacity: 0.6;
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
transform: scale(1.1);
}
}

/* Responsive adjustments */
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
width: 38px;
height: 38px;
font-size: 1rem;
}

.teleprompter-countdown span {
font-size: 5rem;
}
}
</style>
