<script context="module" lang="ts">
  import type {DinoLoad} from 'dinossr';
  import type {APIData, Data, PublicData, ServerData} from '@src/types.ts';

  const id = '[a-f\\d]{8}-[a-f\\d]{4}-7[a-f\\d]{3}-[a-f\\d]{4}-[a-f\\d]{12}';
  export const pattern = `/:id(${id})/:page(\\d+)?/`;

  export const load: DinoLoad<Data> = async ({fetch, params, publicData, serverData}) => {
    const page = Number.parseInt(params.page || '1');
    const responses = [
      fetch(`/api/bookmarks/${params.id}/`),
      fetch(`/api/podcasts/${params.id}/${page}/`)
    ];
    await Promise.allSettled(responses);
    const r1 = await responses[0];
    const r2 = await responses[1];
    if (!r1.ok || !r2.ok) {
      return new Response(null, {status: 404});
    }
    const d1 = (await r1.json()) as APIData;
    const d2 = (await r2.json()) as APIData;
    serverData.bookmarks = d1.bookmarks;
    serverData.podcasts = d2.podcasts;
    publicData.page = page;
  };
</script>

<script lang="ts">
  import {getContext} from 'svelte';
  import Button from '@components/button.svelte';
  import Layout from '@components/layout.svelte';
  import List from '@components/list/list.svelte';
  import ListEpisode from '@components/list/episode.svelte';
  import Next from '@components/icons/next.svelte';
  import Previous from '@components/icons/previous.svelte';

  const {bookmarks, podcasts} = getContext<ServerData>('serverData');
  const {page} = getContext<PublicData>('publicData');

  const podcast = podcasts[0];
  const episodes = podcasts[0].episodes;

  const hasPrev = page > 1;
  const hasNext = Math.ceil(podcast.count / 100) > page;
  const prev = `/podcasts/${podcast.id}/` + (page > 2 ? `${page - 1}/` : '');
  const next = `/podcasts/${podcast.id}/${page + 1}/`;

  let title = podcast.title;
  if (page > 1) title += ` (${page})`;

  const findBookmark = (episodeId: string) => {
    return bookmarks.find((b) => b.ids[1] === episodeId);
  };
</script>

<Layout {title}>
  <h1>
    <a href="/podcasts/{podcast.id}/" data-get>
      <span>{title}</span>
    </a>
  </h1>
  <List empty="No episodes found">
    {#each episodes as episode (episode.id)}
      <ListEpisode {episode} {podcast} bookmark={findBookmark(episode.id)} />
    {/each}
  </List>
  {#if hasPrev || hasNext}
    <div class="Button-pagination">
      <Button href={prev} attr={{'data-get': prev}} disabled={!hasPrev}>
        <Previous slot="icon" />
        <span slot="label" class="hidden">previous page</span>
      </Button>
      <Button href={next} attr={{'data-get': next}} disabled={!hasNext}>
        <Next slot="icon" />
        <span slot="label" class="hidden">next page</span>
      </Button>
    </div>
  {/if}
</Layout>
