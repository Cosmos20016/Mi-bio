<script>
  import { onMount } from 'svelte';
  let url = '';
  let shortenedUrl = '';
  let category = '';

  const autoCategory = (url) => {
    // Logic for auto-detecting category based on the URL
    if (url.includes('news')) {
      return 'News';
    } else if (url.includes('blog')) {
      return 'Blog';
    } else {
      return 'Other';
    }
  };

  const shortenUrl = () => {
    // Your logic to shorten the URL; this could call an API endpoint
    shortenedUrl = `short.ly/${url}`;
    category = autoCategory(url);
  };

  onMount(() => {
    // Initialization logic here
  });
</script>

<main>
  <h1>URL Shortener</h1>
  <input type="text" bind:value={url} placeholder="Enter URL" />
  <button on:click={shortenUrl}>Shorten</button>
  {#if shortenedUrl}
    <p>Shortened URL: {shortenedUrl}</p>
    <p>Category: {category}</p>
  {/if}
</main>
