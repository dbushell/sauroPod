<script context="module" lang="ts">
  import type {DinoLoad} from 'dinossr';
  import type {APIData, Data, ServerData} from '@src/types.ts';

  export const pattern = '/';

  export const load: DinoLoad<Data> = async ({fetch, serverData}) => {
    const response = await fetch(`/api/podcasts/`);
    if (!response.ok) {
      serverData.podcasts = [];
      return;
    }
    const data = (await response.json()) as APIData;
    serverData.podcasts = data.podcasts;
  };
</script>

<script lang="ts">
  import {getContext} from 'svelte';
  import Layout from '@components/layout.svelte';
  import List from '@components/list/list.svelte';
  import ListPodcast from '@components/list/podcast.svelte';

  const {podcasts} = getContext<ServerData>('serverData');

  const title = 'Podcasts';
</script>

<Layout {title}>
  <h1>
    <a href="/podcasts/" data-get>
      <span>{title}</span>
    </a>
  </h1>
  <List empty="No podcasts found">
    {#each podcasts as podcast (podcast.id)}
      <li>
        <ListPodcast {podcast} />
      </li>
    {/each}
  </List>
</Layout>
