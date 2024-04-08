<script context="module" lang="ts">
  export const island = true;
</script>

<script lang="ts">
  import type {PublicData} from '@src/types';
  import {getContext, onMount} from 'svelte';
  import {initLoad} from '@src/browser/state.ts';
  import Button from '@components/button.svelte';
  import Bookmarks from '@components/icons/bookmarks.svelte';
  import Media from '@components/icons/media.svelte';
  import Podcasts from '@components/icons/podcasts.svelte';
  import Settings from '@components/icons/settings.svelte';
  import Stop from '@components/icons/stop.svelte';

  const {app, version} = getContext<PublicData>('publicData');

  let url = getContext<URL>('url');
  let isPlaying = false;

  const onStop = () => {
    globalThis.dispatchEvent(new CustomEvent('app:stop'));
  };

  onMount(() => {
    globalThis.navigator.serviceWorker.register(`/sw.js?v=${version}`);
    globalThis.addEventListener('app:navigated', () => {
      url = new URL(globalThis.location.href);
    });
    globalThis.addEventListener('app:player', (ev: CustomEvent) => {
      isPlaying = 'type' in ev.detail;
    });
    if (document.readyState === 'loading') {
      globalThis.addEventListener('DOMContentLoaded', initLoad);
    } else {
      setTimeout(initLoad, 0);
    }
  });

  $: isPodcasts = /^\/(podcasts|episodes)\//.test(url.pathname);
  $: isMedia = /^\/(audiobooks)\//.test(url.pathname);
  $: isBookmarks = url.pathname.startsWith('/bookmarks/');
  $: isSettings = url.pathname.startsWith('/settings/');

  $: attr = [
    {
      'aria-current': isPodcasts ? 'page' : undefined,
      'data-get': '/podcasts/'
    },
    {
      'aria-current': isMedia ? 'page' : undefined,
      'data-get': '/audiobooks/'
    },
    {
      'aria-current': isBookmarks ? 'page' : undefined,
      'data-get': '/bookmarks/'
    },
    {
      'aria-current': isSettings ? 'page' : undefined,
      'data-get': '/settings/'
    }
  ];
</script>

<header class="Grid | Header">
  <div class="Header__main">
    <a class="Header__logo | flex gap-2xs ai-center" href="/" data-get>
      <span>{app}</span>
    </a>
    {#if isPlaying}
      <div class="Header__menu">
        <Button on:click={onStop} icon small label="Stop" classes={['Button--warn']}>
          <Stop slot="icon" />
        </Button>
      </div>
    {/if}
    <div class="Header__menu">
      <div class="Button-group">
        <Button icon small label="Podcasts" attr={{...attr[0]}}>
          <Podcasts slot="icon" />
        </Button>
        <Button icon small label="Media" attr={{...attr[1]}}>
          <Media slot="icon" />
        </Button>
        <Button icon small label="Bookmarks" attr={{...attr[2]}}>
          <Bookmarks slot="icon" />
        </Button>
        <Button icon small label="Settings" attr={{...attr[3]}}>
          <Settings slot="icon" />
        </Button>
      </div>
    </div>
  </div>
</header>
