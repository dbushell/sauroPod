<script context="module" lang="ts">
  import type {DinoHandle} from '@ssr/dinossr';
  import type {Data} from '@src/types.ts';

  export const GET: DinoHandle<Data> = () => {
    return new Response(null, {
      status: 302,
      headers: {
        location: '/podcasts/'
      }
    });
  };
</script>
