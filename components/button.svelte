<script lang="ts">
  export let label = '';
  export let href: string | undefined = undefined;
  export let type: string | undefined = undefined;
  export let icon: boolean = false;
  export let small: boolean = false;
  export let disabled: boolean = false;
  export let tag = href ? 'a' : 'button';
  export let classes: Array<string> = [];
  export let attr: Record<string, string | boolean | undefined> = {};
  export let node: HTMLElement | undefined = undefined;
</script>

<svelte:element
  this={tag}
  bind:this={node}
  class={['Button', ...classes].join(' ')}
  class:Button--small={small}
  {...{...attr, disabled, href, type}}
  on:click
>
  <slot name="icon" />
  <slot name="label">
    <span class:hidden={icon}>{label}</span>
  </slot>
</svelte:element>
