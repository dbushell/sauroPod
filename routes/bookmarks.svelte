<script context="module" lang="ts">
  import type {DinoLoad} from '@ssr/dinossr';
  import type {APIData, Data, ServerData} from '@src/types.ts';

  export const pattern = '/';

  export const load: DinoLoad<Data> = async ({fetch, serverData}) => {
    const response = await fetch(`/api/bookmarks/`);
    if (!response.ok) {
      serverData.bookmarks = [];
      return;
    }
    const data = (await response.json()) as APIData;
    serverData.bookmarks = data.bookmarks;
  };
</script>

<script lang="ts">
  import {getContext} from 'svelte';
  import {getBookmarkEntity} from '@src/shared/mod.ts';
  import Layout from '@components/layout.svelte';
  import List from '@components/list/list.svelte';
  import ListBookmark from '@components/list/bookmark.svelte';

  const {bookmarks} = getContext<ServerData>('serverData');

  const title = 'Bookmarks';
</script>

<Layout {title}>
  <h1>{title}</h1>
  <List empty="No bookmarks found">
    {#each bookmarks as bookmark}
      <li>
        <ListBookmark entity={getBookmarkEntity(bookmark)} />
      </li>
    {/each}
  </List>
</Layout>
