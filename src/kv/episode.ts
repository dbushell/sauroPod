/**
 * Episode KV module.
 * @module
 */
import type {Episode} from '@src/types.ts';
import {db, isEpisode, isUUID} from './mod.ts';
import {newestSort} from '@src/shared/mod.ts';
import {getPodcast} from '@src/kv/podcast.ts';

/** Return all Episodes */
export const getEpisodes = async (podcastId: string): Promise<Array<Episode>> => {
  if (!isUUID(podcastId)) throw new Error('Invalid UUID');
  const list = db.list<string>({prefix: ['episode', podcastId]});
  const episodes: Array<Episode> = [];
  for await (const entry of list) {
    const key = entry.key.at(-1) as string;
    if (!isUUID(key)) continue;
    const episode = await getEpisode(key);
    if (episode) episodes.push(episode);
  }
  newestSort<Episode>(episodes, 'date');
  return episodes;
};

/** Return all Episodes (pagination optional) */
export const getEpisodesByPage = async (
  podcastId: string,
  limit?: number,
  page = 0
): Promise<Array<Episode>> => {
  const episodes = await getEpisodes(podcastId);
  if (!limit || !episodes.length) return episodes;
  const start = Math.abs(page * limit);
  if (start >= episodes.length) return [];
  return episodes.slice(start, start + limit);
};

/** Return most recent Episode */
export const getLatestEpisode = async (podcastId: string): Promise<Episode | null> => {
  const podcast = await getPodcast(podcastId);
  return podcast?.latestId ? getEpisode(podcast.latestId) : null;
};

/** Return Episode by ID */
export const getEpisode = async (id: string): Promise<Episode | null> => {
  if (!isUUID(id)) throw new Error('Invalid UUID');
  const entry = await db.get<Episode>(['episode', id]);
  return entry.value;
};

/** Add new or update existing Episode */
export const setEpisode = async (data: Episode): Promise<boolean> => {
  if (!isEpisode(data)) throw new Error('Invalid Episode');
  const key = ['episode', data.id];
  const indexKey = ['episode', data.podcastId, data.id];
  const entry = await db.get<Episode>(key);
  const indexEntry = await db.get<Episode>(indexKey);
  const result = await db
    .atomic()
    .check(entry)
    .check(indexEntry)
    .set(key, data)
    .set(indexKey, 1)
    .commit();
  if (!result.ok) return false;
  const episode = await getEpisode(data.id);
  if (episode) {
    const event = entry.value ? 'episode:update' : 'episode:add';
    setTimeout(() => {
      dispatchEvent(new CustomEvent<Episode>(event, {detail: episode}));
    }, 0);
    return true;
  }
  return false;
};

/** Delete Episode by ID */
export const deleteEpisode = async (episode: Episode): Promise<boolean> => {
  if (!isEpisode(episode)) throw new Error('Invalid Episode');
  const key = ['episode', episode.id];
  const indexKey = ['episode', episode.podcastId, episode.id];
  const entry = await db.get<Episode>(key);
  const indexEntry = await db.get<Episode>(indexKey);
  if (!entry.value) return false;
  const result = await db
    .atomic()
    .check(entry)
    .check(indexEntry)
    .delete(key)
    .delete(indexKey)
    .commit();
  if (!result.ok) return false;
  const event = 'episode:delete';
  setTimeout(() => {
    dispatchEvent(new CustomEvent<Episode>(event, {detail: entry.value}));
  }, 0);
  return true;
};
