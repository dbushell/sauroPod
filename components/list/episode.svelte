<script lang="ts">
  import type {Bookmark, Episode, Podcast} from '@src/types.ts';
  import {formatDate, formatTime} from '@src/shared/mod.ts';
  import Cached from '@components/icons/cached.svelte';
  import Played from '@components/icons/played.svelte';

  export let bookmark: Bookmark | undefined = undefined;
  export let episode: Episode;
  export let podcast: Podcast;

  const progress = bookmark ? Math.round((100 / episode.duration) * bookmark.position) : 0;
</script>

<a href="/episodes/{episode.id}/" class="Stack gap-xs" data-play={episode.id}>
  <div class="flex gap-xs ai-center">
    <img
      alt={episode.title}
      src={`/api/artwork/${podcast.id}/`}
      class="flex-shrink-0"
      loading="lazy"
      fetchpriority="low"
      decoding="async"
    />
    <div class="flex-grow-1">
      <div class="flex jc-between ai-start">
        <span class="p" class:color-success={episode.played}>
          {#if episode.played}
            {#if episode.cached}
              <Cached />
            {/if}
            {#if episode.played}
              <Played />
            {/if}
          {/if}
          <span>{episode.title}</span>
        </span>
        {#if episode.duration}
          <span class="color-subtle small monospace">
            {formatTime(episode.duration)}
          </span>
        {/if}
      </div>
      <time class="color-subtle small" datetime={String(episode.date)}>
        <span>{formatDate(new Date(episode.date))}</span>
      </time>
    </div>
  </div>
  {#if progress}
    <progress class="Progress" max="100" value={progress} data-id={episode.id}></progress>
  {/if}
</a>
