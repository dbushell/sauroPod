import type {Data} from '@src/types.ts';
import * as log from 'log';
import {DinoSsr} from 'dinossr';
import {cache} from '@src/cache.ts';
import * as sync from '@src/sync/mod.ts';
import '@src/log.ts';
import '@src/events.ts';
import '@src/shutdown.ts';

const dinossr = new DinoSsr<Data>(import.meta.dirname, {
  dev: true
});

await dinossr.init();

dinossr.router.onError = (error, request) => {
  log.error(request.url);
  log.error(error);
  return new Response(null, {status: 500});
};

dinossr.router.use(({request, platform}) => {
  log.debug(`[${request.method}] ${request.url}`);
  platform.publicData.app = 'sauroPod';
  platform.publicData.version = platform.deployHash;
  platform.serverData.fragment = request.headers.has('x-fragment');
});

const syncNow = async () => {
  const now = performance.now();
  await sync.syncPodcasts();
  await sync.syncAllEpisodes();
  log.info(`Podcast sync in ${((performance.now() - now) / 1000).toFixed(2)}s`);
};

Deno.cron('podcast sync', '*/15 * * * *', {}, syncNow);

Deno.cron('media sync', '0 * * * *', {}, async () => {
  const now = performance.now();
  await sync.syncMedia();
  log.info(`Media sync in ${((performance.now() - now) / 1000).toFixed(2)}s`);
});

Deno.cron('cache clean', '0 0 * * *', {}, async () => {
  await cache.clean();
});

// Sync podcasts if not due in five minutes
if (new Date().getMinutes() % 15 < 10) {
  await syncNow();
}

sync.syncMedia();
