/**
 * Podcast KV module.
 * @module
 */
import * as ark from "arktype";
import * as dz from "drizzle-orm";
import { type Podcast, podcast } from "@src/arktypes.ts";
import { db, podcastTable } from "./drizzle.ts";
import { deleteEpisode, getEpisodes } from "./episode.ts";

type PodcastData = typeof podcastTable.$inferSelect;

/** Convert sqlite data to arktype */
const fromData = (data: PodcastData): Podcast => {
  return {
    ...data,
    modified: new Date(data.modified),
    latestId: data.latestId ?? undefined,
    apiCache: data.apiCache ? new Date(data.apiCache) : undefined,
  };
};

/* Convert arktype to sqlite data */
const toData = (data: Podcast): PodcastData => {
  return {
    ...data,
    modified: data.modified.toISOString(),
    latestId: data.latestId ?? null,
    apiCache: data.apiCache?.toISOString() ?? null,
  };
};

/** Return all Podcasts */
export const getPodcasts = async (): Promise<Array<Podcast>> => {
  const podcasts = await db
    .select()
    .from(podcastTable)
    .orderBy(dz.desc(podcastTable.modified))
    .all();
  return podcasts.map(fromData);
};

/** Return Podcast by URL */
export const getPodcastByURL = async (url: string): Promise<Podcast | null> => {
  const validate = ark.type("string.url")(url);
  if (validate instanceof ark.type.errors) {
    throw new Error(validate.summary);
  }
  const entry = await db
    .select()
    .from(podcastTable)
    .where(dz.eq(podcastTable.url, url))
    .limit(1)
    .all();
  if (entry.length) {
    return fromData(entry[0]);
  }
  return null;
};

/** Return Podcast by ID */
export const getPodcast = async (id: string): Promise<Podcast | null> => {
  const validate = ark.type("string.uuid")(id);
  if (validate instanceof ark.type.errors) {
    throw new Error(validate.summary);
  }
  const entry = await db
    .select()
    .from(podcastTable)
    .where(dz.eq(podcastTable.id, id))
    .limit(1)
    .all();
  if (entry.length) {
    return fromData(entry[0]);
  }
  return null;
};

/** Add new or update existing Podcast */
export const setPodcast = async (data: Podcast): Promise<boolean> => {
  const validate = podcast(data);
  if (validate instanceof ark.type.errors) {
    throw new Error(validate.summary);
  }
  const dbData = toData(data);
  const existing = await getPodcast(data.id);
  if (existing) {
    await db
      .update(podcastTable)
      .set(dbData)
      .where(dz.eq(podcastTable.id, data.id))
      .run();
  } else {
    await db
      .insert(podcastTable)
      .values(dbData)
      .run();
  }
  const event = existing ? "podcast:update" : "podcast:add";
  setTimeout(() => {
    dispatchEvent(new CustomEvent<Podcast>(event, { detail: data }));
  }, 0);
  return true;
};

/** Delete Podcast by ID */
export const deletePodcast = async (id: string): Promise<boolean> => {
  const validate = ark.type("string.uuid")(id);
  if (validate instanceof ark.type.errors) {
    throw new Error(validate.summary);
  }
  const existing = await getPodcast(id);
  if (!existing) return false;
  for (const episode of await getEpisodes(id)) {
    await deleteEpisode(episode.id);
  }
  await db
    .delete(podcastTable)
    .where(dz.eq(podcastTable.id, id))
    .run();
  setTimeout(() => {
    dispatchEvent(
      new CustomEvent<Podcast>("podcast:delete", { detail: existing }),
    );
  }, 0);
  return true;
};
