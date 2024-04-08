<script lang="ts">
  import type {AudioEntity} from '@src/types.ts';
  import {onMount} from 'svelte';
  import {initElements} from '@src/browser/state.ts';
  import Loading from '@components/icons/loading.svelte';
  import Offline from '@components/icons/offline.svelte';
  import Wifioff from '@components/icons/wifioff.svelte';

  export let isLoaded: boolean;
  export let isOffline: boolean;
  export let isDownload: boolean;
  export let player: AudioEntity;

  let parentRef: HTMLElement;

  onMount(() => {
    initElements(parentRef);
  });
</script>

<p class="mb-0">
  {#if player.type === 'podcast'}
    <img
      alt={player.titles.at(-2)}
      src={`/api/artwork/${player.ids.at(-2)}/`}
      class="Icon"
      loading="eager"
      fetchpriority="high"
      decoding="async"
    />
  {/if}
  {#if isOffline}
    <Wifioff />
  {/if}
  {#if isDownload}
    <Offline />
  {/if}
  {#if !isLoaded}
    <span class="hidden">Loading…</span>
  {/if}
  <span>{player.titles.at(-1)}</span>
  {#if !isLoaded}
    <Loading />
  {/if}
</p>
<p bind:this={parentRef} class="mb-0 flex flex-wrap gap-xs small">
  {#if player.ids.length > 2}
    <a href={`/${player.type}s/${player.ids.at(-3)}/`} data-get>
      {player.titles.at(-3)}
    </a>
    <a href={`/${player.type}s/${player.ids.at(-3)}/${player.ids.at(-2)}/`} data-get>
      {player.titles.at(-2)}
    </a>
  {:else}
    <a href={`/${player.type}s/${player.ids.at(-2)}/`} data-get>
      {player.titles.at(-2)}
    </a>
  {/if}
</p>
