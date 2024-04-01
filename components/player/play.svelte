<script lang="ts">
  import Button from '@components/button.svelte';
  import Play from '@components/icons/play.svelte';

  export let isDisabled: boolean;
</script>

<Button icon type="button" label="Play" disabled={isDisabled} on:click>
  <Play slot="icon" />
</Button>
