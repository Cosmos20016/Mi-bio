<script lang="ts">
  import { onMount } from "svelte";

  export let videoUrl: string = "/videos/intro.mp4"; // ruta en public/videos/...
  export let autoplay: boolean = true;

  let videoEl: HTMLVideoElement | null = null;
  let showing = true;
  let fading = false;

  function handleEnded() {
    fading = true;
    // duración debe coincidir con la transición CSS (0.5s)
    setTimeout(() => {
      showing = false;
      fading = false;
      // liberar recursos
      if (videoEl) {
        try {
          videoEl.pause();
          videoEl.src = "";
        } catch (e) {}
      }
    }, 600);
  }

  onMount(() => {
    if (!videoEl) return;
    // Intentar forzar play (autoplay suele funcionar si está muted)
    const p = videoEl.play();
    if (p && p.catch) {
      p.catch(() => {
        // Si falla autoplay (raro con muted), ocultamos el video y dejamos la imagen
        showing = false;
      });
    }
  });
</script>

{#if showing}
  <video
    bind:this={videoEl}
    class:fade={fading}
    class="vb-video"
    src={videoUrl}
    autoplay={autoplay}
    muted
    playsinline
    preload="auto"
    on:ended={handleEnded}
    aria-hidden="true"
  />
{/if}

<style>
  :global(.vb-video) {
    position: absolute;
    inset: 0; /* top:0; right:0; bottom:0; left:0 */
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 20; /* sobre la imagen (ImageWrapper tiene z menor) */
    opacity: 1;
    transition: opacity 0.5s ease;
    pointer-events: none;
    background: transparent;
  }
  :global(.fade) {
    opacity: 0;
  }
</style>
