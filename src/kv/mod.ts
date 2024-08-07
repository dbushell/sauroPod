/**
 * KV database module.
 * @module
 */
export const uuid = () => crypto.randomUUID();

export const db = await Deno.openKv(Deno.env.get('DENO_KV_URL') ?? './.data/denokv.sqlite');

export * from '@src/kv/media.ts';
export * from '@src/kv/bookmark.ts';
export * from '@src/kv/episode.ts';
export * from '@src/kv/podcast.ts';
export * from '@src/kv/validate.ts';
