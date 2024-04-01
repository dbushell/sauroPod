/**
 * Client-side Svelte store for offline downloads.
 * Interacts with the Web Worker found in `static/worker.js`.
 * @module
 * @see {@link https://dbushell.com/2023/10/02/storage-apis-downloading-files-for-offline-access/}
 */
import {get, writable, type Writable} from 'svelte/store';

export interface Download {
  contentLength: number;
  contentSize: number;
  progress: number;
}

export interface Store {
  cached: string[];
  downloads: {[key: string]: Download};
  quota: number;
  usage: number;
}

export const offlineStore: Writable<Store> = writable({
  cached: [],
  downloads: {},
  quota: 0,
  usage: 0
});

/** Offline Web Worker instance */
let worker: Worker;

export const initWorker = async (url: string): Promise<void> => {
  worker = new Worker(url, {
    type: 'module'
  });

  worker.addEventListener('message', (ev) => {
    const {id, type} = ev.data;
    if (type === 'abort') {
      removeItem(id);
      return;
    }
    if (type === 'progress') {
      const offline = get(offlineStore);
      const {contentLength, contentSize} = ev.data;
      offline.downloads[id] = {
        contentLength,
        contentSize,
        progress: (100 / contentLength) * contentSize
      };
      offlineStore.set(offline);
      return;
    }
    if (type === 'done') {
      const {contentType, contentSize} = ev.data;
      // clear progress
      const offline = get(offlineStore);
      delete offline.downloads[id];
      offlineStore.set(offline);
      // save metadata if successful
      if (contentType && contentSize) {
        localStorage.setItem(
          id,
          JSON.stringify({
            contentType,
            contentSize
          })
        );
      }
      updateStore();
      return;
    }
  });

  await updateStore();
};

const updateStore = async (): Promise<void> => {
  try {
    const root = await navigator.storage.getDirectory();
    const cached = [];
    // @ts-ignore TypeScript out of date
    for await (const [key] of root.entries()) {
      cached.push(key);
    }
    offlineStore.set({...get(offlineStore), cached});
    navigator.storage.estimate().then(({quota, usage}) => {
      offlineStore.set({
        ...get(offlineStore),
        quota: quota ?? 0,
        usage: usage ?? 0
      });
    });
  } catch (err) {
    console.warn(err);
  }
};

export const hasItem = (id: string): boolean => {
  return get(offlineStore).cached.includes(id);
};

export const getItem = async (id: string): Promise<Blob | null> => {
  try {
    const meta = JSON.parse(localStorage.getItem(id) ?? '{}');
    if (!meta.contentType) {
      throw new Error(`No metadata (${id})`);
    }
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(id);
    const file = await handle.getFile();
    return new Blob([file], {type: meta.contentType});
  } catch (err) {
    console.warn(err);
    removeItem(id);
  } finally {
    await updateStore();
  }
  return null;
};

export const removeItem = async (id: string) => {
  try {
    localStorage.removeItem(id);
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(id);
  } catch (err) {
    console.warn(err);
  } finally {
    await updateStore();
  }
};

export const addItem = ({id, url}: {id: string; url: URL}) => {
  worker.postMessage({type: 'download', id, url: url.href});
};

export const offline = {
  add: addItem,
  has: hasItem,
  get: getItem,
  init: initWorker,
  remove: removeItem
} as const;
