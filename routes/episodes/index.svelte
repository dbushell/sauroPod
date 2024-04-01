<script context="module" lang="ts">
  import type {DinoLoad} from 'dinossr';
  import type {APIData, ServerData} from '@src/types.ts';

  export const pattern = '/:id([a-f\\d]{8}-[a-f\\d]{4}-7[a-f\\d]{3}-[a-f\\d]{4}-[a-f\\d]{12})/';

  export const load: DinoLoad = async ({fetch, params, serverData}) => {
    const response = await fetch(`/api/episodes/${params.id}/`);
    if (!response.ok) {
      return new Response(null, {status: 404});
    }
    const data = (await response.json()) as APIData;
    serverData.bookmark = data.episodes[0].bookmark;
    serverData.episode = data.episodes[0].episode;
    serverData.podcast = data.episodes[0].podcast;
  };
</script>

<script lang="ts">
  import {getContext} from 'svelte';
  import Layout from '@components/layout.svelte';
  import List from '@components/list/list.svelte';
  import ListEpisode from '@components/list/episode.svelte';

  const {bookmark, episode, podcast} = getContext<ServerData>('serverData');

  const title = `${episode.title} - ${podcast.title}`;
</script>

<Layout {title} playId={episode.id}>
  <h1>
    <a href="/podcasts/{podcast.id}/" data-get="/podcasts/{podcast.id}/">
      <span>{podcast.title}</span>
    </a>
  </h1>
  <List>
    <ListEpisode {bookmark} {episode} {podcast} />
  </List>
</Layout>
