<script lang="ts">
  import type {Podcast} from '@src/types.ts';
  import {formatDate} from '@src/shared/mod.ts';

  export let podcast: Podcast;
</script>

<a class="flex gap-xs ai-center" href="/podcasts/{podcast.id}/" data-get>
  <img
    alt={podcast.title}
    src={`/api/artwork/${podcast.id}/`}
    class="flex-shrink-0"
    loading="lazy"
    fetchpriority="low"
    decoding="async"
  />
  <span class="flex-grow-1">
    <span class="block p">
      {podcast.title}
    </span>
    <div class="flex jc-between ai-start">
      <time class="color-subtle small" datetime={String(podcast.modified)}>
        {formatDate(new Date(podcast.modified))}
      </time>
      <span class="color-subtle small monospace">
        {podcast.count ?? 0}
      </span>
    </div>
  </span>
</a>
