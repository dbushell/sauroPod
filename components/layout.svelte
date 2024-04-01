<script lang="ts">
  import type {PublicData} from '@src/types.ts';
  import {getContext} from 'svelte';
  import Footer from '@components/footer.svelte';
  import Header from '@components/header.svelte';
  import Player from '@components/player.svelte';

  export let title: string;
  export let playId: string | undefined = undefined;

  const {app} = getContext<PublicData>('publicData');

  title = title ? `${title} - ${app}` : app;
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<div class="App">
  <Header />
  <Player {playId} />
  <main class="Grid | Container">
    <div class="Stack">
      <slot />
    </div>
  </main>
  <Footer />
</div>

<style>
  @font-face {
    font-family: 'Sora';
    src: url('/fonts/Sora-Variable.woff2?v=%DEPLOY_HASH%') format('woff2');
    font-display: swap;
    font-weight: 100 800;
    font-style: normal;
  }

  @font-face {
    font-family: 'RedditMono';
    src: url('/fonts/RedditMono-Light.woff2?v=%DEPLOY_HASH%') format('woff2');
    font-display: swap;
    font-weight: 400;
    font-style: normal;
    /* Hyphen, numbers, and colon */
    unicode-range: U+002D, U+0030-003A;
  }

  :root {
    --color-orange: 80% 0.16 78;
    --color-red: 60% 0.2 18;
    --font-display: 'Sora', sans-serif;
    --font-sans: 'Sora', sans-serif;
    --font-monospace: 'RedditMono', monospace;

    &.navigating * {
      cursor: wait;
    }
  }

  :global(*) {
    touch-action: manipulation;
  }

  :global(img:where([src*='/artwork/'])) {
    --size: calc(2 * (var(--font-size) * var(--line-height)));
    block-size: var(--size);
    border-radius: calc((5 / 16) * 1rem);
    inline-size: var(--size);
    overflow: clip;
  }

  :global(h1) {
    --font-size: var(--step-3);
    color: oklch(var(--color-anchor));

    & a {
      text-decoration: none;
    }
  }

  :global(.p) {
    line-height: inherit;
  }

  :global(.color-warn) {
    color: oklch(var(--color-red));
  }

  :global(.color-success) {
    color: oklch(var(--color-green));
  }

  :global(.color-active) {
    color: oklch(var(--color-secondary));
  }

  :global(.Button--warn) {
    --color-primary: var(--color-red);
    --color-secondary: var(--color-red);
  }

  :global(.Progress) {
    --size: calc((2 / 16) * 1rem);
  }

  :global(.Icon) {
    aspect-ratio: 1 / 1;
    fill: currentColor;
  }

  :global(:where(:not(.Button)) > .Icon) {
    --size: calc((var(--font-size) * var(--line-height)));
    display: inline-block;
    block-size: var(--size);
    inline-size: var(--size);
    transform: scale(0.75);
    vertical-align: top;

    &[src] {
      transform: none;
    }
  }
</style>
