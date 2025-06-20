/**
 * KV database module.
 * @module
 */
export const uuid = () => crypto.randomUUID();

export const db = await Deno.openKv(
  Deno.env.get("DENO_KV_URL") ?? `file://${Deno.cwd()}/.data/denokv.sqlite`,
);

export * from "./media.ts";
export * from "./bookmark.ts";
export * from "./episode.ts";
export * from "./podcast.ts";
export * from "./validate.ts";
