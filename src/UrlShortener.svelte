<script>
  import { onMount } from 'svelte';

  let url = '';
  let shortenedUrl = '';

  async function shorten() {
    if (url) {
      const response = await fetch(`https://api.example.com/shorten?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      shortenedUrl = data.shortenedUrl;
    }
  }

  // Additional logic for category detection can go here

  onMount(() => {
    // Initialize component
  });
</script>

<template>
  <div>
    <input type="text" bind:value={url} placeholder="Enter URL" />
    <button on:click={shorten}>Shorten</button>
    {#if shortenedUrl}
      <p>Shortened URL: {shortenedUrl}</p>
    {/if}
  </div>
</template>
