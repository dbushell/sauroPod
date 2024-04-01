<script lang="ts">
  export let empty = '';
</script>

<div class="List">
  {#if empty}
    <p>{empty}</p>
  {/if}
  <slot />
</div>

<style>
  .List {
    margin-inline: calc(-0.5 * var(--grid-column-gap));
  }

  p:not(:only-child) {
    display: none;
  }
</style>
