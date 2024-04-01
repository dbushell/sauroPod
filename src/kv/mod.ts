/**
 * KV database module.
 * @module
 */
import {uuidv7} from '@src/vendor/uuidv7/mod.ts';

export const uuid = () => uuidv7();
export const uuidPattern = () => /^[a-f\d]{8}-[a-f\d]{4}-7[a-f\d]{3}-[a-f\d]{4}-[a-f\d]{12}$/;

export const db = await Deno.openKv(Deno.env.get('DENO_KV_URL') ?? './.data/denokv.sqlite');

export * from './bookmark.ts';
export * from './episode.ts';
export * from './podcast.ts';
export * from './validate.ts';
