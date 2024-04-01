<script context="module" lang="ts">
  import type {DinoHandle} from 'dinossr';

  export const GET: DinoHandle = () => {
    return new Response(null, {
      status: 302,
      headers: {
        location: '/podcasts/'
      }
    });
  };
</script>
