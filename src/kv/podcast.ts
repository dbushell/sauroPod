/**
 * Podcast KV module.
 * @module
 */
import type { Podcast } from "@src/types.ts";
import { db, isPodcast, isURL, isUUID } from "./mod.ts";
import { newestSort } from "@src/utils/mod.ts";

/** Return all Podcasts */
export const getPodcasts = async (): Promise<Array<Podcast>> => {
  const list = db.list<Podcast>({ prefix: ["podcast"] });
  const podcasts = await Array.fromAsync(list, ({ value }) => value);
  newestSort<Podcast>(podcasts, "modified");
  return podcasts;
};

/** Return Podcast by URL */
export const getPodcastByURL = async (url: string): Promise<Podcast | null> => {
  if (!isURL(url, false)) throw new Error("Invalid URL");
  const podcasts = await getPodcasts();
  return podcasts.find((p) => p.url === url) ?? null;
};

/** Return Podcast by ID */
export const getPodcast = async (id: string): Promise<Podcast | null> => {
  if (!isUUID(id)) throw new Error("Invalid UUID");
  const entry = await db.get<Podcast>(["podcast", id]);
  return entry.value;
};

/** Add new or update existing Podcast */
export const setPodcast = async (data: Podcast): Promise<boolean> => {
  if (!isPodcast(data)) throw new Error("Invalid Podcast");
  const key = ["podcast", data.id];
  const entry = await db.get<Podcast>(key);
  const result = await db.atomic().check(entry).set(key, data).commit();
  if (!result.ok) return false;
  const podcast = await getPodcast(data.id);
  if (podcast) {
    const event = entry.value ? "podcast:update" : "podcast:add";
    setTimeout(() => {
      dispatchEvent(new CustomEvent<Podcast>(event, { detail: podcast }));
    }, 0);
    return true;
  }
  return false;
};

/** Delete Podcast by ID */
export const deletePodcast = async (id: string): Promise<boolean> => {
  if (!isUUID(id)) throw new Error("Invalid UUID");
  const key = ["podcast", id];
  const entry = await db.get<Podcast>(key);
  if (!entry.value) return false;
  const result = await db.atomic().check(entry).delete(key).commit();
  if (!result.ok) return false;
  const event = "podcast:delete";
  setTimeout(() => {
    dispatchEvent(new CustomEvent<Podcast>(event, { detail: entry.value }));
  }, 0);
  return true;
};
