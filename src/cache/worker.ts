/// <reference lib="WebWorker"/>
/**
 * Handle audio and artwork download cache.
 * @module
 */
import type {CacheItem} from '@src/types.ts';
import * as path from '@std/path';
import * as mediaTypes from '@std/media-types';
import {deepFreeze} from '@src/shared/mod.ts';
import {db} from '@src/kv/mod.ts';
import {log} from '@src/log.ts';

const cachePath = Deno.env.get('APP_CACHE_PATH') ?? path.join(Deno.cwd(), './.cache');

const acceptHeaders = {
  json: ['application/json;q=0.9', 'text/json;q=0.8', 'text/plain;q=0.7'] as const,
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
deepFreeze(acceptHeaders);

const abortMap = new WeakMap<CacheItem, AbortController>();

self.addEventListener('message', (ev: MessageEvent<CacheItem>) => {
  const item = ev.data;
  abortMap.set(item, new AbortController());
  handleFetch(item)
    .then((status) => {
      self.postMessage({status, url: item.url});
    })
    .catch(() => {
      self.postMessage({status: 500, url: item.url});
    })
    .finally(() => {
      abortMap.delete(item);
    });
});

const handleFetch = async (item: CacheItem): Promise<number> => {
  log.debug(`Fetch started: ${item.url}`);
  const {hash, url} = item;
  const pathname = path.join(cachePath, hash);
  const controller = abortMap.get(item)!;

  // Looked for catched item
  let cached = false;
  if (item.options.maxAge) {
    try {
      const stat = await Deno.stat(pathname);
      if (!stat.birthtime) {
        throw new Error();
      }
      // Check cached file age
      const age = Date.now() - stat.birthtime.getTime();
      if (age < item.options.maxAge) {
        cached = true;
      } else {
        await Deno.remove(pathname);
      }
    } catch {
      cached = false;
    }
  }

  // Serve cached file
  if (cached) {
    log.debug(`Fetch from cache: ${url}`);
    return 304;
  }

  log.debug(`Fetch from network: ${url}`);

  // Start five minute timer
  const timeout = setTimeout(() => {
    if (controller.signal.aborted === false) {
      controller.abort();
    }
  }, 1000 * 60 * 5);

  // Fetch from network
  let file: Deno.FsFile | undefined;
  try {
    const headers = new Headers();
    if (item.options.media) {
      headers.set('accept', acceptHeaders[item.options.media].join(', '));
    }
    const response = await globalThis.fetch(url, {
      signal: controller.signal,
      headers
    });
    if (!response.ok || !response.body) {
      return response.status < 400 ? 404 : response.status;
    }

    // Remember content type in KV store
    const contentType =
      mediaTypes.contentType(response.headers.get('content-type') ?? '') ??
      mediaTypes.contentType(path.extname(url)) ??
      'audio/mpeg';

    // Save metadata
    await db.set(['fetch', hash, 'content-type'], contentType);
    await db.set(['fetch', hash, 'max-age'], item.options.maxAge);

    const file = await Deno.open(pathname, {
      create: true,
      truncate: true,
      write: true
    });
    await response.body.pipeTo(file.writable);
  } catch (err) {
    if (controller.signal.aborted) {
      return 504;
    }
    log.error(err);
    return 500;
  } finally {
    try {
      if (timeout) clearTimeout(timeout);
      if (file) file.close();
    } catch (err) {
      log.error(err);
    }
  }
  return 200;
};
