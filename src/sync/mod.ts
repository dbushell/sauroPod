/**
 * Data synchronization module.
 * @module
 */
import { log } from "@src/log.ts";

const worker = new Worker(import.meta.resolve("./worker.ts"), {
  type: "module",
});

let deferred: ReturnType<typeof Promise.withResolvers<void>> | null = null;

worker.addEventListener("message", (ev: MessageEvent) => {
  if (ev.data === "sync") {
    if (deferred) deferred.resolve();
  }
  if (ev.data.event && ev.data.detail) {
    dispatchEvent(new CustomEvent(ev.data.event, { detail: ev.data.detail }));
  }
});

export const syncPodcasts = async () => {
  log.info(`Sync started`);
  const now = performance.now();
  if (deferred === null) {
    deferred = Promise.withResolvers();
    worker.postMessage("sync");
  }
  await deferred.promise;
  deferred = null;
  log.info(`Podcast sync in ${((performance.now() - now) / 1000).toFixed(2)}s`);
};

export const close = () => {
  worker.terminate();
};
