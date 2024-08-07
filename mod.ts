#!/usr/bin/env -S deno run --no-lock --unstable-kv --unstable-cron --allow-all mod.ts --dev

import type {Data} from '@src/types.ts';
import {DinoSsr, type DinoRouter} from '@ssr/dinossr';
import * as cache from '@src/cache/mod.ts';
import {syncMedia} from '@src/sync/media.ts';
import {syncPodcasts} from '@src/sync/mod.ts';
import {log} from '@src/log.ts';
import '@src/events.ts';
import '@src/shutdown.ts';

if (import.meta.main) {
  const dinossr = new DinoSsr<Data>(import.meta.dirname, {
    dev: Deno.args.includes('--dev')
  });

  await dinossr.init();

  const router: DinoRouter<Data> = dinossr.router;

  router.onError = (error, request) => {
    log.error(request.url);
    log.error(error);
    return new Response(null, {status: 500});
  };

  router.use(({request, platform}) => {
    log.debug(`[${request.method}] ${request.url}`);
    platform.publicData.app = 'sauroPod';
    platform.publicData.version = platform.deployHash;
    platform.serverData.fragment = request.headers.has('x-fragment');
  });

  if (Deno.args.includes('--cron')) {
    // Every 15 minutes
    Deno.cron('podcast sync', '*/15 * * * *', {}, async () => {
      await syncPodcasts();
    });
    // Every hour
    Deno.cron('media sync', '0 * * * *', {}, async () => {
      await syncMedia();
    });
    // Every day
    Deno.cron('cache clean', '0 0 * * *', {}, async () => {
      await cache.clean();
    });
  }

  if (Deno.args.includes('--sync')) {
    setTimeout(() => {
      syncPodcasts().finally(() => {
        syncMedia();
      });
    }, 5000);
  }
}
