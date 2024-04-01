/**
 * Handle audio and artwork download cache.
 * @module
 */
import * as log from 'log';
import * as path from 'path';
import {Diplodocache} from 'diplodocache';
import {logLevel, logLocale} from '@src/log.ts';

export const accept = {
  rss: ['application/rss+xml;q=0.9', 'application/xml;q=0.8', 'text/xml;q=0.7'] as const,
  audio: ['audio/aac;q=1.0', 'audio/mpeg;q=0.9', 'audio/*;q=0.8'] as const,
  image: [
    'image/avif;q=1.0',
    'image/webp;q=0.9',
    'image/png;q=0.8',
    'image/jpeg;q=0.7',
    'image/jpg;q=0.7'
  ] as const
};
Object.freeze(accept);

export const defaults = {
  image: {
    accept: [...accept.image],
    compress: false,
    maxAge: 1000 * 60 * 60 * 24 * 2
  },
  audio: {
    accept: [...accept.audio],
    compress: false,
    maxAge: 1000 * 60 * 60 * 24 * 30
  }
} as const;
Object.freeze(defaults);

const cachePath = Deno.env.get('APP_CACHE_PATH') ?? path.join(Deno.cwd(), './.cache');

export const cache = new Diplodocache({
  cachePath,
  logger: log,
  logLevel: logLevel,
  logLocale: logLocale,
  logTimestamp: false
});
