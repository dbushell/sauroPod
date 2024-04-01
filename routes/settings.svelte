<script context="module" lang="ts">
  import type {DinoLoad} from 'dinossr';
  import type {APIData, ServerData} from '@src/types.ts';

  export const pattern = '/';

  export const load: DinoLoad = async ({fetch, serverData}) => {
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
  import Button from '@components/button.svelte';
  import Layout from '@components/layout.svelte';
  import List from '@components/list/list.svelte';

  const {podcasts} = getContext<ServerData>('serverData');

  const title = 'Settings';
</script>

<Layout {title}>
  <h1>{title}</h1>
  <form class="Stack gap-xs" method="POST" action="/api/podcasts/">
    <label for="url" class="p">Add Feed URL:</label>
    <div class="flex gap-xs">
      <input required type="url" name="url" id="url" class="Field flex-grow-1" autocomplete="off" />
      <Button type="submit" label="Add New" classes={['flex-shrink-0']} />
    </div>
  </form>
  <List empty="No podcasts found">
    {#each podcasts as { podcast } (podcast.id)}
      <form class="Stack gap-xs" method="POST" action="/api/podcasts/{podcast.id}/">
        <label for="{podcast.id}-url" class="small">{podcast.title}:</label>
        <div class="flex gap-xs">
          <input
            type="url"
            class="Field flex-grow-1"
            id="{podcast.id}-url"
            value={podcast.url}
            readonly
            required
          />
          <Button type="submit" label="Remove" classes={['flex-shrink-0']} />
        </div>
      </form>
    {/each}
  </List>
</Layout>
