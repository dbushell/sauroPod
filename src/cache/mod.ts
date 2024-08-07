/**
 * Handle audio and artwork download cache.
 * @module
 */
import type {CacheItem, CacheOptions} from '@src/types.ts';
import {assertInstanceOf} from '@std/assert';
import * as fs from '@std/fs';
import {log} from '@src/log.ts';
import * as path from '@std/path';
import {serveFile} from '@std/http';
import {Queue} from '@dbushell/carriageway';
import {db} from '@src/kv/mod.ts';
import {fetchSortQueue} from '@src/shared/mod.ts';
import {encodeHash} from '@src/utils.ts';

const cachePath = Deno.env.get('APP_CACHE_PATH') ?? path.join(Deno.cwd(), './.cache');

const fetchMap = new Map<string, CacheItem>();
const fetchRequests = new WeakMap<CacheItem, Request>();
const fetchDeferred = new WeakMap<CacheItem, ReturnType<typeof Promise.withResolvers<Response>>>();
const fetchQueue = new Queue<CacheItem, Response>({concurrency: 5});

const worker = new Worker(import.meta.resolve('./worker.ts'), {
  type: 'module'
});

worker.addEventListener('message', async (ev: MessageEvent<{status: number; url: string}>) => {
  const {status, url} = ev.data;
  // Retrieve item
  const item = fetchMap.get(url);
  assertInstanceOf(item, Object, `Fetch worker not mapped: ${url}`);
  // Retrieve deferred promise
  const deferred = fetchDeferred.get(item);
  assertInstanceOf(deferred?.promise, Promise, `Fetch worker not defered: ${url}`);
  log.debug(`Fetch worker: [${status}] ${url}`);
  // Return failed fetch errors
  const pathname = path.join(cachePath, item.hash);
  if (status >= 400) {
    deferred.resolve(new Response(null, {status}));
    purge(item.hash);
    return;
  }
  // Serve cached file for requests
  const request = fetchRequests.get(item);
  if (request) {
    const response = await serveFile(request, pathname);
    // Restore content type from KV store
    const contentType = await db.get<string>(['fetch', item.hash, 'content-type']);
    response.headers.set('content-type', contentType.value ?? 'audio/mpeg');
    deferred.resolve(response);
    return;
  }
  // Return prefetch
  deferred.resolve(new Response());
});

/** Validate and default options */
const fetchOptions = (config: CacheOptions = {}): CacheOptions => {
  const options = {...config};
  const oneHour = 1000 * 60 * 60;
  switch (options.media) {
    case 'audio':
      options.maxAge ??= oneHour * 24 * 30;
      break;
    case 'image':
      options.maxAge ??= oneHour * 24 * 2;
      break;
    default:
      options.maxAge ??= oneHour;
  }
  return options;
};

/**
 * Fetch from cache or network
 * @todo Account for different requests?
 */
export const fetch = async (
  url: URL,
  request?: Request,
  options: CacheOptions = {}
): Promise<Response> => {
  // Return active fetch if in progress
  if (fetchMap.has(url.href)) {
    const fetching = fetchQueue.get(fetchMap.get(url.href)!);
    assertInstanceOf(fetching, Promise, `Fetch missing: ${url.href}`);
    if (fetching) {
      return fetching.then((response) => response.clone());
    }
  }
  // Create new request item
  const item: CacheItem = {
    hash: await encodeHash(url.href),
    options: fetchOptions(options),
    url: url.href
  };
  // Save and start fetch
  fetchMap.set(url.href, item);
  if (request) {
    fetchRequests.set(item, request);
  }

  const response = fetchQueue
    .append(item, () => {
      const deferred = Promise.withResolvers<Response>();
      fetchDeferred.set(item, deferred);
      worker.postMessage(item);
      return deferred.promise;
    })
    .catch((err) => {
      log.error(err);
      return new Response(null, {status: 500});
    })
    .finally(() => {
      log.debug(`Fetch resolved: ${url.href}`);
      fetchMap.delete(url.href);
      fetchRequests.delete(item);
      fetchDeferred.delete(item);
    });

  fetchSortQueue(fetchQueue);

  return response;
};

/** Test if cache has file hash */
export const exists = (hash: string): Promise<boolean> => {
  const pathname = path.join(cachePath, hash);
  return fs.exists(pathname);
};

/** Read file from cache by hash */
export const pull = async (hash: string): Promise<Uint8Array | null> => {
  if (!(await exists(hash))) {
    return null;
  }
  const pathname = path.join(cachePath, hash);
  return Deno.readFile(pathname);
};

/** Add file to cache by hash */
export const push = (
  data: Uint8Array,
  options: {hash: string; contentType: string; maxAge: number}
): Promise<unknown> => {
  return Promise.all([
    db.set(['fetch', options.hash, 'content-type'], options.contentType),
    db.set(['fetch', options.hash, 'max-age'], options.maxAge),
    Deno.writeFile(path.join(cachePath, options.hash), data)
  ]);
};

/**
 * Attempt to delete cached file
 * @param url Original URL or URL hash of item to remove
 */
export const purge = async (url: string | URL): Promise<void> => {
  const hash = url instanceof URL ? await encodeHash(url.href) : url;
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
    const age = Date.now() - stat.birthtime.getTime();
    if (age >= (maxAge?.value ?? 0)) {
      await purge(entry.name);
    }
  }
};

/** Force any active fetches to be aborted */
export const close = async () => {
  worker.terminate();
  for (const item of fetchMap.values()) {
    log.warn(`Fetch abort: ${item.url}`);
    await purge(item.hash);
  }
};
