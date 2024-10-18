/// <reference lib="WebWorker"/>
/**
 * Podcast and episode sync tasks.
 * @module
 */
import { syncAllEpisodes } from "@src/sync/episode.ts";
import { syncAllPodcasts } from "@src/sync/podcast.ts";
import { log } from "@src/log.ts";

const events = [
  "podcast:sync",
  "podcast:add",
  "podcast:delete",
  "episode:add",
  "episode:delete",
];

// Forward events to main thread
for (const event of events) {
  addEventListener(
    event,
    ((ev: CustomEvent<unknown>) => {
      self.postMessage({ event, detail: ev.detail });
    }) as unknown as EventListener,
  );
}

let syncing = false;

self.addEventListener("message", (ev: MessageEvent) => {
  if (ev.data === "sync") {
    syncNow();
  }
});

const syncNow = async () => {
  if (syncing) {
    return;
  }
  try {
    syncing = true;
    await syncAllPodcasts();
    await syncAllEpisodes();
  } catch (err) {
    log.error(err);
  } finally {
    syncing = false;
    self.postMessage("sync");
  }
};
