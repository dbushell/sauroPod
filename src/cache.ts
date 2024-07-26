/**
 * Handle audio and artwork download cache.
 * @module
 */
import type {FetchItem} from '@src/types.ts';
import * as fs from 'fs';
import * as log from 'log';
import * as path from 'path';
import * as mediaTypes from 'media-types';
import {Queue} from 'carriageway';
import {serveFile} from 'file-server';
import {db} from '@src/kv/mod.ts';
import {deepFreeze} from '@src/shared/mod.ts';
import {encodeHash} from '@src/vendor/murmurhash/mod.ts';

export const acceptHeaders = {
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

const cachePath = Deno.env.get('APP_CACHE_PATH') ?? path.join(Deno.cwd(), './.cache');

const fetchMap = new Map<string, FetchItem>();
const fetchQueue = new Queue<FetchItem, Response>({concurrency: 5});
const fetchRequests = new WeakMap<FetchItem, Request>();

/** Default `queue.sort` value function */
const sortValue = ({options: {media}}: FetchItem) => {
  switch (media) {
    case 'json':
    case 'rss':
      return 1;
    case 'image':
      return 2;
    case 'audio':
      return 4;
    default:
      return 3;
  }
};

/** Sort queue by mime type priority */
export const sortQueue = (queue: Queue<FetchItem, Response>) => {
  queue.sort((a, b) => sortValue(a) - sortValue(b));
};

/**
 * Fetch from cache or network
 * @todo Account for different requests?
 */
export const fetch = (
  url: URL,
  request?: Request,
  options: FetchItem['options'] = {}
): Promise<Response> => {
  // Return active fetch request
  if (fetchMap.has(url.href)) {
    const fetching = fetchQueue.get(fetchMap.get(url.href)!);
    if (fetching) {
      log.debug(`Fetch in progress: ${url.href}`);
      return fetching.then((response) => response.clone());
    } else {
      log.error(`Fetch missing: ${url.href}`);
    }
  }
  // Create new request item
  const item: FetchItem = {
    url,
    controller: new AbortController(),
    hash: encodeHash(url.href),
    options: {...options}
  };
  if (item.options.media === 'audio') {
    item.options.maxAge ??= 1000 * 60 * 60 * 24 * 30;
  } else if (item.options.media === 'image') {
    item.options.maxAge ??= 1000 * 60 * 60 * 24 * 2;
  } else {
    item.options.maxAge ??= 1000 * 60 * 60;
  }

  // Save and start fetch
  fetchMap.set(url.href, item);
  if (request) {
    fetchRequests.set(item, request);
  }
  const deferred = fetchQueue
    .append(item, fetchCallback)
    .catch((err) => {
      log.error(`Fetch callback error`);
      log.error(err);
      return new Response(null, {status: 500});
    })
    .finally(() => {
      log.debug(`Fetch resolved: ${url.href}`);
      fetchMap.delete(url.href);
      fetchRequests.delete(item);
    });
  sortQueue(fetchQueue);

  // Return deferred
  return deferred;
};

/**
 * Fetch callback
 * @todo Tee network fetch to disk and response?
 */
const fetchCallback = async (item: FetchItem): Promise<Response> => {
  log.debug(`Fetch started: ${item.url.href}`);
  const {hash, url} = item;
  const pathname = path.join(cachePath, hash);

  // Resolve final response
  const respond = async () => {
    const request = fetchRequests.get(item);
    if (request) {
      const response = await serveFile(request, pathname);
      // Restore content type from KV store
      const contentType = await db.get<string>(['fetch', hash, 'content-type']);
      response.headers.set('content-type', contentType.value ?? 'audio/mpeg');
      return response;
    } else {
      log.debug('Prefetch complete');
      return new Response();
    }
  };

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
    log.debug(`Fetch from cache: ${url.href}`);
    return respond();
  }

  log.debug(`Fetch from network: ${url.href}`);

  // Handle abort cleanup
  const onAbort = () => purge(url);
  item.controller.signal.addEventListener('abort', onAbort);

  // Start timer for fetch
  const timeout = setTimeout(() => {
    if (item.controller.signal.aborted === false) {
      item.controller.abort();
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
      signal: item.controller.signal,
      headers
    });
    if (!response.ok || !response.body) {
      let {status} = response;
      status = status < 400 ? 404 : status;
      return new Response(null, {status});
    }

    // Remember content type in KV store
    const contentType =
      mediaTypes.contentType(response.headers.get('content-type') ?? '') ??
      mediaTypes.contentType(path.extname(url.href)) ??
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
    if (!item.controller.signal.aborted) {
      log.error(`Fetch network error`);
      log.error(err);
    }
    return new Response(null, {status: 500});
  } finally {
    try {
      item.controller.signal.removeEventListener('abort', onAbort);
      if (timeout) clearTimeout(timeout);
      if (file) file.close();
    } catch (err) {
      log.error(`Fetch finally error`);
      log.error(err);
    }
  }
  return respond();
};

/**
 * Attempt to delete cached file
 * @param url Original URL or URL hash of item to remove
 */
export const purge = async (url: string | URL): Promise<void> => {
  const hash = url instanceof URL ? encodeHash(url.href) : url;
  try {
    // Cleanup metadata
    for await (const entry of db.list({prefix: ['fetch', hash]})) {
      await db.delete(entry.key);
    }
    await Deno.remove(path.join(cachePath, hash));
    log.debug(`Purged cache: ${url}`);
  } catch {
    // Doesn't matter...
  }
};

/** Delete expired cache files */
export const clean = async () => {
  const walk = fs.walk(cachePath, {maxDepth: 1, includeDirs: false});
  for await (const entry of walk) {
    const stat = await Deno.stat(entry.path);
    if (!stat.birthtime) continue;
    const maxAge = await db.get<number>(['fetch', entry.name, 'max-age']);
    if (!maxAge.value) continue;
    const age = Date.now() - stat.birthtime.getTime();
    if (age >= maxAge.value) {
      await purge(entry.name);
    }
  }
};

/** Force any active fetches to be aborted */
export const close = async () => {
  for (const item of fetchMap.values()) {
    log.debug(`Fetch abort: ${item.url.href}`);
    item.controller.abort();
    await purge(item.url);
  }
};
