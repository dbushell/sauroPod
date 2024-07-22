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

    & li {
      display: contents;

      &:not(:has(*)) {
        display: none;
      }

      & > * {
        border: inherit;
        inline-size: inherit;
        min-inline-size: inherit;
        padding: inherit;
      }
    }
  }

  li:not(:only-child) {
    display: none;
  }
</style>
