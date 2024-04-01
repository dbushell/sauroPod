<script lang="ts">
  import Button from '@components/button.svelte';
  import Forward from '@components/icons/forward.svelte';
  import Rewind from '@components/icons/rewind.svelte';

  export let id: 'fast-forward' | 'rewind';
  export let skip: number;
  export let isDisabled: boolean;
</script>

<Button icon type="button" disabled={isDisabled} on:click>
  <svelte:fragment slot="icon">
    {#if id === 'fast-forward'}
      <Forward />
    {:else}
      <Rewind />
    {/if}
  </svelte:fragment>
  <span slot="label">
    <span class="hidden">{id}</span>
    <span>{skip}</span>
    <span class="hidden">seconds</span>
  </span>
</Button>

<style>
  span {
    pointer-events: none;
    user-select: none;

    &:not(.hidden) {
      font-size: calc((8 / 16) * 1rem);
      font-family: var(--font-monospace);
      font-weight: 400;
      inset-block-start: 50%;
      inset-inline-start: 50%;
      line-height: 1;
      position: absolute;
      transform: translate(-50%, -50%);
    }
  }
</style>
