/**
 * Client-side storage for offline downloads.
 * Interacts with the Web Worker found in `static/worker.js`.
 * @module
 * @see {@link https://dbushell.com/2023/10/02/storage-apis-downloading-files-for-offline-access/}
 */
/**
 * @typedef {import('@src/types.ts').OfflineStore} OfflineStore
 */

/**
 * Offline store metadata
 * @type {OfflineStore}
 */
const store = {
  cached: new Set(),
  downloads: new Map(),
  usage: 0,
  quota: 0,
};

/**
 * Web Worker instance
 * @type {Worker}
 */
let worker;

const initWorker = async () => {
  worker = new Worker("/scripts/sauropod-worker.js?v=%DEPLOY_HASH%", {
    type: "module",
  });

  worker.addEventListener("message", (ev) => {
    const { id, type } = ev.data;
    if (type === "abort") {
      removeItem(id);
      return;
    }
    if (type === "progress") {
      const { contentLength, contentSize } = ev.data;
      store.downloads.set(id, {
        contentLength,
        contentSize,
        progress: (100 / contentLength) * contentSize,
      });
      return;
    }
    if (type === "done") {
      const { contentType, contentSize } = ev.data;
      // clear progress
      store.downloads.delete(id);
      // save metadata if successful
      if (contentType && contentSize) {
        localStorage.setItem(
          id,
          JSON.stringify({
            contentType,
            contentSize,
          }),
        );
      }
      updateStore();
      return;
    }
  });

  await updateStore();
};

const updateStore = async () => {
  try {
    const root = await navigator.storage.getDirectory();
    store.cached.clear();
    for await (const [key] of root.entries()) {
      store.cached.add(key);
    }
    await navigator.storage.estimate().then(({ quota, usage }) => {
      store.quota = quota;
      store.usage = usage;
    });
    globalThis.dispatchEvent(new CustomEvent("app:store"));
  } catch (err) {
    console.warn(err);
  }
};

/**
 * @param {string} id
 * @returns {boolean}
 */
const hasItem = (id) => (store.cached.has(id));

/**
 * @param {string} id
 * @returns {boolean}
 */
const pendingItem = (id) => (store.downloads.has(id));

/**
 * @param {string} id
 * @returns {Promise<Blob | null>}
 */
const getItem = async (id) => {
  try {
    const meta = JSON.parse(localStorage.getItem(id) ?? "{}");
    if (!meta.contentType) {
      throw new Error(`No metadata (${id})`);
    }
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(id);
    const file = await handle.getFile();
    return new Blob([file], { type: meta.contentType });
  } catch (err) {
    console.warn(err);
    removeItem(id);
  } finally {
    await updateStore();
  }
  return null;
};

/**
 * @param {string} id
 */
const removeItem = async (id) => {
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

/**
 * @param {{ id: string; url: URL }} item
 */
const addItem = ({ id, url }) => {
  worker.postMessage({ type: "download", id, url: url.href });
};

export const offline = {
  store,
  add: addItem,
  has: hasItem,
  get: getItem,
  init: initWorker,
  remove: removeItem,
  pending: pendingItem,
};
