/**
 * Handle graceful shutdown.
 * @module
 */
import * as log from 'log';
import * as cache from '@src/cache.ts';

const unload = Promise.withResolvers<void>();
let activated = false;

const beforeUnload = async () => {
  log.critical('💀 Shutdown activated');
  await cache.close();
  log.getLogger().handlers.forEach((handler) => {
    if (handler instanceof log.FileHandler) {
      handler.flush();
    }
  });
  unload.resolve();
};

export const shutdown = async () => {
  if (activated) return;
  activated = true;
  beforeUnload();
  await unload.promise;
  Deno.exit();
};

Deno.addSignalListener('SIGTERM', shutdown);
Deno.addSignalListener('SIGINT', shutdown);
