/// <reference lib="WebWorker"/>

self.addEventListener('message', (ev) => {
  const {type} = ev.data;
  if (type === 'download') {
    download(ev.data);
  }
});

const download = async ({id, url}) => {
  const root = await navigator.storage.getDirectory();
  const controller = new AbortController();
  let contentType = '';
  let contentSize = 0;
  try {
    const handle = await root.getFileHandle(id, {create: true});
    const writable = await handle.createSyncAccessHandle();

    const update = (contentLength = 0, contentSize = 0) => {
      self.postMessage({
        type: 'progress',
        id,
        contentLength,
        contentSize
      });
    };

    const response = await fetch(url, {signal: controller.signal});
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    contentType = response.headers.get('content-type') ?? '';
    const contentLength = Number.parseInt(response.headers.get('content-length') ?? '0');

    update(contentLength, contentSize);

    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        break;
      }
      contentSize += value.length;
      writable.write(value);
      update(contentLength, contentSize);
    }

    writable.close();
  } catch (err) {
    console.warn(err);
    contentType = '';
    contentSize = 0;
    controller.abort();
    self.postMessage({type: 'abort', id});
  } finally {
    self.postMessage({type: 'done', id, contentType, contentSize});
  }
};
