import type {DinoHandle} from 'dinossr';
import type {Data} from '@src/types.ts';
import {encodeHash} from '@src/vendor/murmurhash/mod.ts';

export const pattern = '*';
export const order = 999;

/** Map URL to body hash and last modified date */
const modifiedMap = new Map<string, {hash: string; date: string}>();

export const GET: DinoHandle<Data> = async ({request, response}) => {
  if (!response) return;
  if (response.ok && request.headers.has('x-fragment')) {
    const last = modifiedMap.get(request.url);
    const body = await response.text();
    const hash = encodeHash(body);
    const date = !last || hash !== last.hash ? new Date().toUTCString() : last.date;
    modifiedMap.set(request.url, {hash, date});
    response.headers.set('last-modified', date);
    response.headers.set('etag', `W/"${hash}"`);
    response.headers.set('cache-control', 'public, max-age=0, must-revalidate');
    if (request.headers.get('if-modified-since') === date) {
      response = new Response(null, {status: 304});
    } else {
      const match = /<main\s[^>]*>(.+?)<\/main>/i.exec(body);
      if (match) {
        let partial = match[1];
        const title = /<title>(.+?)<\/title>/i.exec(body);
        if (title) partial = `${title[0]}\n${partial}`;
        response = new Response(partial, response);
      } else {
        response = new Response(body, response);
      }
    }
  }
  response.headers.set('vary', 'x-fragment');
  // Add some flair
  response.headers.set('x-powered-by', 'sauropod');
  // Allow Blob URLs for media
  response.headers.append('x-media-src', `blob:`);
  response.headers.append('x-img-src', `blob:`);
  return response;
};
