<script lang="ts">
  import type {Bookmark, Episode, Podcast} from '@src/types.ts';
  import {formatTime} from '@src/shared/mod.ts';
  import Button from '@components/button.svelte';
  import BookmarkX from '@components/icons/bookmark-x.svelte';
  import Download from '@components/icons/download.svelte';
  import Play from '@components/icons/play.svelte';
  import Trash from '@components/icons/trash.svelte';

  export let bookmark: Bookmark;
  export let episode: Episode;
  export let podcast: Podcast;

  const progress = Math.round((100 / episode.duration) * bookmark.position);
</script>

<article id="bookmark-{episode.id}" class="Stack gap-xs">
  <p>
    <img
      alt={podcast.title}
      src={`/api/artwork/${podcast.id}/`}
      class="Icon"
      loading="lazy"
      fetchpriority="low"
      decoding="async"
    />
    <span>{episode.title}</span>
  </p>
  <div class="flex flex-wrap jc-between gap-xs ai-center">
    <div class="small flex flex-wrap gap-xs ai-baseline">
      <span class="monospace color-subtle">
        {formatTime(bookmark.position)}
      </span>
      <a href={`/podcasts/${podcast.id}/`} data-get={`/podcasts/${podcast.id}/`}>
        {podcast.title}
      </a>
    </div>
    <div class="flex flex-wrap gap-2xs ai-center">
      <Button
        icon
        small
        type="button"
        label="remove offline download"
        attr={{'data-purge': `${episode.id}`}}
        classes={['hidden']}
      >
        <Trash slot="icon" />
      </Button>
      <Button
        icon
        small
        type="button"
        label="download for offline play"
        attr={{'data-download': `${episode.id}`}}
      >
        <Download slot="icon" />
      </Button>
      <div class="Button-group mb-0">
        <Button
          icon
          small
          type="button"
          label="remove bookmark"
          classes={['Button--warn']}
          attr={{
            'data-delete': `/api/bookmarks/${episode.id}/`,
            'data-confirm': 'Are you sure you want to remove this bookmark?',
            'data-selector': `#bookmark-${episode.id}`,
            'data-action': 'delete'
          }}
        >
          <BookmarkX slot="icon" />
        </Button>
      </div>
      <Button
        icon
        small
        type="button"
        label="resume playback"
        attr={{'data-play': `${episode.id}`}}
      >
        <Play slot="icon" />
      </Button>
    </div>
  </div>
  <progress class="Progress" max="100" value={progress} data-id={episode.id}></progress>
</article>
