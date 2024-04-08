<script context="module" lang="ts">
  import type {DinoLoad} from 'dinossr';
  import type {APIData, Data, ServerData} from '@src/types.ts';

  export const pattern = '/';

  export const load: DinoLoad<Data> = async ({fetch, serverData}) => {
    const response = await fetch(`/api/artists/`);
    if (!response.ok) {
      serverData.artists = [];
      return;
    }
    const data = (await response.json()) as APIData;
    serverData.artists = data.artists;
  };
</script>

<script lang="ts">
  import {getContext} from 'svelte';
  import Layout from '@components/layout.svelte';
  import List from '@components/list/list.svelte';

  const {artists} = getContext<ServerData>('serverData');

  const title = 'Audiobooks';
</script>

<Layout {title}>
  <h1>
    <span>{title}</span>
  </h1>
  <List empty="No audiobooks found">
    {#each artists as artist (artist.id)}
      <a class="flex gap-xs jc-between ai-start" href="/audiobooks/{artist.id}/" data-get>
        <span class="p">{artist.title}</span>
        <span class="color-subtle small monospace">{artist.count}</span>
      </a>
    {/each}
  </List>
</Layout>
