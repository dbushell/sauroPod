/**
 * Handle global event listeners.
 * @module
 */
import type {Bookmark, Episode, Podcast} from '@src/types.ts';
import * as log from 'log';
import * as kv from '@src/kv/mod.ts';
import {cache, defaults} from '@src/cache.ts';

addEventListener('podcast:sync', (async (event: CustomEvent<Podcast>) => {
  const podcast = event.detail;
  log.info(`Sync podcast: "${podcast.title}"`);
  const episode = await kv.getLatestEpisode(podcast.id);
  if (!episode) return;
  cache.fetch(episode.url, undefined, {
    ...structuredClone(defaults.audio),
    prefetch: true
  });
}) as EventListener);

addEventListener('podcast:add', ((event: CustomEvent<Podcast>) => {
  const podcast = event.detail;
  log.info(`Add podcast: "${podcast.title}"`);
  cache.fetch(podcast.image, undefined, {
    ...structuredClone(defaults.image),
    prefetch: true
  });
}) as EventListener);

addEventListener('episode:add', ((event: CustomEvent<Episode>) => {
  const episode = event.detail;
  log.debug(`Add episode: "${episode.title}"`);
}) as EventListener);

addEventListener('podcast:delete', (async (event: CustomEvent<Podcast>) => {
  const podcast = event.detail;
  log.info(`Delete podcast: "${podcast.title}"`);
  // Delete artwork
  cache.purge(podcast.image);
  // Delete all Episodes
  for (const episode of await kv.getEpisodes(podcast.id)) {
    await kv.deleteEpisode(episode);
  }
}) as EventListener);

addEventListener('episode:delete', (async (event: CustomEvent<Episode>) => {
  const episode = event.detail;
  log.debug(`Delete episode: "${episode.title}"`);
  // Delete audio
  cache.purge(episode.url);
  // Delete Bookmark
  const bookmark = await kv.getBookmark(episode.podcastId, episode.id);
  if (!bookmark) return;
  await kv.deleteBookmark(bookmark);
}) as EventListener);

addEventListener('bookmark:delete', ((event: CustomEvent<Bookmark>) => {
  const bookmark = event.detail;
  log.debug(`Delete bookmark: ${bookmark.ids.join(', ')}`);
}) as EventListener);
