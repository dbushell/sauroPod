<script lang="ts">
  import type {Episode, Podcast} from '@src/types.ts';
  import {onMount} from 'svelte';
  import {initElements} from '@src/browser/state.ts';
  import Loading from '@components/icons/loading.svelte';
  import Offline from '@components/icons/offline.svelte';
  import Wifioff from '@components/icons/wifioff.svelte';

  export let isLoaded: boolean;
  export let isOffline: boolean;
  export let isDownload: boolean;
  export let episode: Episode;
  export let podcast: Podcast;

  let podcastRef: HTMLElement;

  onMount(() => {
    initElements(podcastRef);
  });
</script>

<p class="mb-0">
  <img
    alt={episode.title}
    src={`/api/artwork/${episode.podcastId}/`}
    class="Icon"
    loading="eager"
    fetchpriority="high"
    decoding="async"
  />
  {#if isOffline}
    <Wifioff />
  {/if}
  {#if isDownload}
    <Offline />
  {/if}
  {#if !isLoaded}
    <span class="hidden">Loading…</span>
  {/if}
  <span>{episode.title}</span>
  {#if !isLoaded}
    <Loading />
  {/if}
</p>
{#if podcast}
  <p bind:this={podcastRef} class="mb-0 flex flex-wrap gap-xs small">
    <a href={`/podcasts/${podcast.id}/`} data-get={`/podcasts/${podcast.id}/`}>
      {podcast.title}
    </a>
  </p>
{/if}
