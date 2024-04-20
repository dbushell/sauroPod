<script lang="ts">
  import type {AudioEntity} from '@src/types.ts';
  import {formatTime} from '@src/shared/mod.ts';
  import Button from '@components/button.svelte';
  import BookmarkX from '@components/icons/bookmark-x.svelte';
  import Download from '@components/icons/download.svelte';
  import Play from '@components/icons/play.svelte';
  import Trash from '@components/icons/trash.svelte';

  export let entity: AudioEntity;

  const progress = Math.round((100 / entity.duration) * entity.bookmark.position);

  const parentHref =
    entity.type == 'podcast'
      ? `/podcasts/${entity.ids[0]}/`
      : `/audiobooks/${entity.ids[0]}/${entity.ids[1]}/`;

  const dataAudio = `/api/audio/${entity.ids.join('/')}/`;

  const dataPlay =
    entity.type === 'podcast' ? `/episodes/${entity.ids[1]}/` : `/songs/${entity.ids.join('/')}/`;
</script>

<article id="bookmark-{entity.ids.at(-1)}" class="Stack gap-xs">
  <p>
    {#if entity.type === 'podcast'}
      <img
        alt={entity.titles[0]}
        src={`/api/artwork/${entity.ids[0]}/`}
        class="Icon"
        loading="lazy"
        fetchpriority="low"
        decoding="async"
      />
    {/if}
    <span>{entity.titles.at(-1)}</span>
  </p>
  <div class="flex flex-wrap jc-between gap-xs ai-center">
    <div class="small flex flex-wrap gap-xs ai-baseline">
      <span class="monospace color-subtle">
        {formatTime(entity.bookmark.position)}
      </span>
      <a href={parentHref} data-get>
        {entity.titles.at(-2)}
      </a>
    </div>
    <div class="flex flex-wrap gap-2xs ai-center">
      <Button
        icon
        small
        type="button"
        label="remove offline download"
        attr={{'data-purge': dataAudio}}
        classes={['hidden']}
      >
        <Trash slot="icon" />
      </Button>
      <Button
        icon
        small
        type="button"
        label="download for offline play"
        attr={{'data-download': dataAudio}}
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
            'data-delete': `/api/bookmarks/${entity.ids.join('/')}/`,
            'data-confirm': 'Are you sure you want to remove this bookmark?',
            'data-selector': `#bookmark-${entity.ids.at(-1)}`,
            'data-action': 'delete'
          }}
        >
          <BookmarkX slot="icon" />
        </Button>
      </div>
      <Button icon small type="button" label="resume playback" attr={{'data-play': dataPlay}}>
        <Play slot="icon" />
      </Button>
    </div>
  </div>
  <progress class="Progress" max="100" value={progress} data-id={entity.ids.at(-1)}></progress>
</article>
