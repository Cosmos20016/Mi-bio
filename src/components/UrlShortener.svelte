<script>
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    
    export let url = '';
    export let shortenedUrl = writable('');
    
    const shortenUrl = async () => {
        const response = await fetch('/api/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        const data = await response.json();
        shortenedUrl.set(data.shortenedUrl);
    };

    onMount(() => {
        // Fetching initial data or any necessary setup can go here.
    });
</script>

<style>
    .url-shortener {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    input {
        width: 300px;
        padding: 10px;
        margin: 5px 0;
    }
    button {
        padding: 10px 20px;
        margin-top: 10px;
    }
    .shortened {
        color: green;
        margin-top: 20px;
    }
</style>

<template>
    <div class="url-shortener">
        <h1>URL Shortener</h1>
        <input type="text" placeholder="Enter your URL" bind:value={url} />
        <button on:click={shortenUrl}>Shorten URL</button>
        {#if $shortenedUrl}
            <p class="shortened">Shortened URL: <a href="{$shortenedUrl}" target="_blank">{$shortenedUrl}</a></p>
        {/if}
    </div>
</template>