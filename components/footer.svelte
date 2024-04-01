<script lang="ts">
  import type {PublicData} from '@src/types';
  import {getContext} from 'svelte';

  const {app, version} = getContext<PublicData>('publicData');

  const year = new Date().getFullYear();
</script>

<footer class="Grid | Footer" aria-label="information">
  <div class="Footer__main | Stack gap-s ji-center">
    <p>
      <small>
        <span>{app} &copy; {year}</span>
        <a href="https://dbushell.com/" rel="noreferrer" target="_blank">
          <span>David Bushell</span>
        </a>
        <span> • </span>
        <a href="https://github.com/dbushell/sauropod" rel="noreferrer" target="_blank">
          <span>GitHub</span>
        </a>
      </small>
    </p>
    <p><small>{version}</small></p>
  </div>
</footer>
