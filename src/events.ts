/**
 * Handle global event listeners.
 * @module
 */
import type {
  Album,
  Artist,
  Bookmark,
  Episode,
  Podcast,
  Song,
} from "@src/types.ts";
import { log } from "@src/log.ts";
import * as kv from "@src/sqlite/mod.ts";
import * as cache from "@src/cache/mod.ts";

addEventListener(
  "podcast:sync",
  (async (event: CustomEvent<Podcast>) => {
    const podcast = event.detail;
    log.info(`Sync podcast: "${podcast.title}"`);
    const episode = await kv.getLatestEpisode(podcast.id);
    if (!episode) return;
    cache.fetch(new URL(episode.url), undefined, {
      media: "audio",
      prefetch: true,
    });
  }) as unknown as EventListener,
);

addEventListener(
  "podcast:add",
  ((event: CustomEvent<Podcast>) => {
    const podcast = event.detail;
    log.info(`Add podcast: "${podcast.title}"`);
    cache.fetch(new URL(podcast.image), undefined, {
      media: "image",
      prefetch: true,
    });
  }) as unknown as EventListener,
);

addEventListener(
  "episode:add",
  ((event: CustomEvent<Episode>) => {
    const episode = event.detail;
    log.debug(`Add episode: "${episode.title}"`);
  }) as unknown as EventListener,
);

addEventListener(
  "podcast:delete",
  ((event: CustomEvent<Podcast>) => {
    const podcast = event.detail;
    log.info(`Delete podcast: "${podcast.title}"`);
    // Delete artwork
    cache.purge(new URL(podcast.image));
  }) as unknown as EventListener,
);

addEventListener(
  "episode:delete",
  (async (event: CustomEvent<Episode>) => {
    const episode = event.detail;
    log.debug(`Delete episode: "${episode.title}"`);
    // Delete audio
    cache.purge(new URL(episode.url));
    // Delete Bookmark
    const bookmark = await kv.getBookmark(episode.podcastId, episode.id);
    if (!bookmark) return;
    await kv.deleteBookmark(bookmark);
  }) as unknown as EventListener,
);

addEventListener(
  "artist:delete",
  ((event: CustomEvent<Artist>) => {
    const artist = event.detail;
    log.debug(`Delete artist: "${artist.title}"`);
  }) as unknown as EventListener,
);

addEventListener(
  "album:delete",
  ((event: CustomEvent<Album>) => {
    const album = event.detail;
    log.debug(`Delete album: "${album.title}"`);
  }) as unknown as EventListener,
);

addEventListener(
  "song:delete",
  (async (event: CustomEvent<Song>) => {
    const song = event.detail;
    log.debug(`Delete song: "${song.title}"`);
    // Delete Bookmark
    const bookmark = await kv.getBookmark(song.artistId, song.albumId, song.id);
    if (!bookmark) return;
    await kv.deleteBookmark(bookmark);
  }) as unknown as EventListener,
);

addEventListener(
  "bookmark:delete",
  ((event: CustomEvent<Bookmark>) => {
    const bookmark = event.detail;
    log.debug(`Delete bookmark: ${bookmark.ids.join(", ")}`);
  }) as unknown as EventListener,
);
