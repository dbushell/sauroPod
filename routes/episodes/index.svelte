<script context="module" lang="ts">
  import type {DinoLoad} from 'dinossr';
  import type {APIData, Data, ServerData} from '@src/types.ts';

  const id = '[a-f\\d]{8}-[a-f\\d]{4}-4[a-f\\d]{3}-[a-f\\d]{4}-[a-f\\d]{12}';
  export const pattern = `/:id(${id})/`;

  export const load: DinoLoad<Data> = async ({fetch, params, serverData}) => {
    const response = await fetch(`/api/episodes/${params.id}/`);
    if (!response.ok) {
      return new Response(null, {status: 404});
    }
    const data = (await response.json()) as APIData;
    serverData.episodes = data.episodes;
    serverData.podcasts = [data.episodes[0].podcast];
    serverData.bookmarks = [data.episodes[0].bookmark];
  };
</script>

<script lang="ts">
  import {getContext} from 'svelte';
  import Layout from '@components/layout.svelte';
  import List from '@components/list/list.svelte';
  import ListEpisode from '@components/list/episode.svelte';

  const {bookmarks, episodes, podcasts} = getContext<ServerData>('serverData');

  const bookmark = bookmarks[0];
  const episode = episodes[0];
  const podcast = podcasts[0];

  const title = `${episode.title} - ${podcast.title}`;
</script>

<Layout {title} playId={`/episodes/${episode.id}/`}>
  <h1>
    <a href="/podcasts/{podcast.id}/" data-get>
      <span>{podcast.title}</span>
    </a>
  </h1>
  <List>
    <li>
      <ListEpisode {bookmark} {episode} {podcast} />
    </li>
  </List>
</Layout>
