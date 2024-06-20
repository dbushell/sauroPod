<script lang="ts">
  export let empty = '';
</script>

<ul class="List">
  {#if empty}
    <li><p>{empty}</p></li>
  {/if}
  <slot />
</ul>

<style>
  .List {
    margin-inline: calc(-0.5 * var(--grid-column-gap));
  }

  li:not(:only-child) {
    display: none;
  }
</style>
