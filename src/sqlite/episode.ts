/**
 * Episode SQLite module.
 * @module
 */
import { ark } from "arktype";
import * as dz from "drizzle-orm";
import { type Episode, episode } from "@src/arktypes.ts";
import { db, episodeTable } from "./drizzle.ts";

type EpisodeData = typeof episodeTable.$inferSelect;

/** Convert sqlite data to arktype */
const fromData = (data: EpisodeData): Episode => {
  return {
    ...data,
    date: new Date(data.date),
    guid: data.guid ?? undefined,
    played: data.played === 1,
  };
};

/* Convert arktype to sqlite data */
const toData = (data: Episode): EpisodeData => {
  return {
    ...data,
    date: data.date.toISOString(),
    guid: data.guid ?? null,
    played: data.played ? 1 : 0,
  };
};

/** Return all Episodes */
export const getEpisodes = async (
  podcastId: string,
): Promise<Array<Episode>> => {
  const validate = ark.type("string.uuid")(podcastId);
  if (validate instanceof ark.type.errors) {
    throw new Error(validate.summary);
  }
  const episodes = await db
    .select()
    .from(episodeTable)
    .where(dz.eq(episodeTable.podcastId, podcastId))
    .orderBy(dz.desc(episodeTable.date))
    .all();
  return episodes.map(fromData);
};

/** Return all Episodes (pagination optional) */
export const getEpisodesByPage = async (
  podcastId: string,
  limit?: number,
  page = 0,
): Promise<Array<Episode>> => {
  const validate = ark.type("string.uuid")(podcastId);
  if (validate instanceof ark.type.errors) {
    throw new Error(validate.summary);
  }
  const offset = Math.max(0, page) * (limit ?? 100);
  const episodes = await db
    .select()
    .from(episodeTable)
    .where(dz.eq(episodeTable.podcastId, podcastId))
    .orderBy(dz.desc(episodeTable.date))
    .limit(limit ?? 100)
    .offset(offset)
    .all();
  return episodes.map(fromData);
};

/** Return most recent Episode */
export const getLatestEpisode = async (
  podcastId: string,
): Promise<Episode | null> => {
  return (await getEpisodesByPage(podcastId, 1))?.[0] ?? null;
};

/** Return Episode by ID */
export const getEpisode = async (id: string): Promise<Episode | null> => {
  const validate = ark.type("string.uuid")(id);
  if (validate instanceof ark.type.errors) {
    throw new Error(validate.summary);
  }
  const entry = await db
    .select()
    .from(episodeTable)
    .where(dz.eq(episodeTable.id, id))
    .limit(1)
    .all();
  if (entry.length) {
    return fromData(entry[0]);
  }
  return null;
};

/** Add new or update existing Episode */
export const setEpisode = async (data: Episode): Promise<boolean> => {
  const validate = episode(data);
  if (validate instanceof ark.type.errors) {
    throw new Error(validate.summary);
  }
  const dbData = toData(data);
  const existing = await getEpisode(data.id);
  if (existing) {
    await db
      .update(episodeTable)
      .set(dbData)
      .where(dz.eq(episodeTable.id, data.id))
      .run();
  } else {
    await db
      .insert(episodeTable)
      .values(dbData)
      .run();
  }
  const event = existing ? "episode:update" : "episode:add";
  setTimeout(() => {
    dispatchEvent(new CustomEvent<Episode>(event, { detail: data }));
  }, 0);
  return true;
};

/** Delete Episode by ID */
export const deleteEpisode = async (id: string): Promise<boolean> => {
  const validate = ark.type("string.uuid")(id);
  if (validate instanceof ark.type.errors) {
    throw new Error(validate.summary);
  }
  const existing = await getEpisode(id);
  if (!existing) return false;
  await db
    .delete(episodeTable)
    .where(dz.eq(episodeTable.id, id))
    .run();
  setTimeout(() => {
    dispatchEvent(
      new CustomEvent<Episode>("episode:delete", { detail: existing }),
    );
  }, 0);
  return true;
};
