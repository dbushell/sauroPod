<script context="module" lang="ts">
  import type {DinoLoad} from 'dinossr';
  import type {APIData, Data, ServerData} from '@src/types.ts';

  const id = '[a-f\\d]{8}-[a-f\\d]{4}-4[a-f\\d]{3}-[a-f\\d]{4}-[a-f\\d]{12}';
  export const pattern = `/:id(${id})/`;

  export const load: DinoLoad<Data> = async ({fetch, params, serverData}) => {
    const response = await fetch(`/api/albums/${params.id}/`);
    if (!response.ok) {
      serverData.artists = [];
      serverData.albums = [];
      return;
    }
    const data = (await response.json()) as APIData;
    serverData.artists = data.artists;
    serverData.albums = data.albums;
  };
</script>

<script lang="ts">
  import {getContext} from 'svelte';
  import Layout from '@components/layout.svelte';
  import List from '@components/list/list.svelte';

  const {artists} = getContext<ServerData>('serverData');
  const {albums} = getContext<ServerData>('serverData');

  const title = `${artists[0].title} - Audiobooks`;
</script>

<Layout {title}>
  <h1>
    <span>{artists[0].title}</span>
  </h1>
  <List empty="No audiobooks found">
    <li>
      <a class="flex gap-xs jc-between ai-start" href="/audiobooks/" data-get>
        <span class="p color-subtle">Return</span>
      </a>
    </li>
    {#each albums as album (album.id)}
      <li>
        <a
          class="flex gap-xs jc-between ai-start"
          href="/audiobooks/{album.artistId}/{album.id}/"
          data-get
        >
          <span class="p">{album.title}</span>
          <span class="color-subtle small monospace">{album.count}</span>
        </a>
      </li>
    {/each}
  </List>
</Layout>
