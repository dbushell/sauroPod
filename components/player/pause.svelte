<script lang="ts">
  import Button from '@components/button.svelte';
  import Pause from '@components/icons/pause.svelte';

  export let isDisabled: boolean;
</script>

<Button icon type="button" label="Pause" disabled={isDisabled} on:click>
  <Pause slot="icon" />
</Button>
