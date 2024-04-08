<script context="module" lang="ts">
  import type {DinoLoad} from 'dinossr';
  import type {APIData, Data, ServerData} from '@src/types.ts';

  const id = '[a-f\\d]{8}-[a-f\\d]{4}-7[a-f\\d]{3}-[a-f\\d]{4}-[a-f\\d]{12}';
  export const pattern = `/:artistId(${id})/:albumId(${id})/`;

  export const load: DinoLoad<Data> = async ({fetch, params, serverData}) => {
    const response = await fetch(`/api/songs/${params.artistId}/${params.albumId}/`);
    if (!response.ok) {
      serverData.artists = [];
      serverData.albums = [];
      serverData.songs = [];
      return;
    }
    const data = (await response.json()) as APIData;
    serverData.artists = data.artists;
    serverData.albums = data.albums;
    serverData.songs = data.songs;
  };
</script>

<script lang="ts">
  import {getContext} from 'svelte';
  import {formatTime} from '@src/shared/mod.ts';
  import Layout from '@components/layout.svelte';
  import List from '@components/list/list.svelte';

  const {artists} = getContext<ServerData>('serverData');
  const {albums} = getContext<ServerData>('serverData');
  const {songs} = getContext<ServerData>('serverData');

  const title = `${albums[0].title} - ${artists[0].title} - Audiobooks`;
</script>

<Layout {title}>
  <h1>
    <span>{albums[0].title}</span>
  </h1>
  <List empty="No audiobooks found">
    <a class="flex gap-xs jc-between ai-start" href={`/audiobooks/${artists[0].id}/`} data-get>
      <span class="p color-subtle">Return</span>
    </a>
    {#each songs as song (song.id)}
      <button
        type="button"
        class="flex gap-xs jc-between ai-start"
        data-play="/songs/{song.artistId}/{song.albumId}/{song.id}/"
      >
        <span class="p">{song.title}</span>
        <span class="color-subtle small monospace">{formatTime(song.duration)}</span>
      </button>
    {/each}
  </List>
</Layout>
