<script lang="ts">
  export let isPlaying: boolean;
</script>

<div hidden={!isPlaying} aria-hidden="true">
  <svg viewBox="0 0 100 100">
    <path d="M50 0a5 5 0 0 0 0 10v.006A45.028 45.028 0 0 1 52.316 100 50.027 50.027 0 0 0 50 0z" />
  </svg>
</div>

<style>
  @keyframes -global-atom {
    to {
      transform: rotate(360deg);
    }
  }

  div {
    --atom-size: var(--space-m);
    --atom-left: calc(((100% - var(--atom-size)) / var(--range-max)) * var(--range-value));
    --atom-transform: translateX(calc(-50% + (var(--atom-size) / 2))) translateY(-50%);
    block-size: var(--atom-size);
    inline-size: var(--atom-size);
    inset-block-start: 50%;
    inset-inline-start: var(--atom-left);
    position: absolute;
    pointer-events: none;

    &[hidden] {
      display: none;
    }

    &:nth-last-child(1) {
      transform: var(--atom-transform) scaleX(1.5) rotateZ(45deg) scaleY(0.4);
    }

    &:nth-last-child(2) {
      transform: var(--atom-transform) scaleX(1.5) rotateZ(-45deg) scaleY(0.4);
    }
  }

  svg {
    animation: atom 1s linear infinite;
    display: block;
    block-size: var(--atom-size);
    fill: oklch(var(--color-text));
    inline-size: var(--atom-size);
  }
</style>
