import type {DinoHandle} from 'dinossr';
import * as kv from '@src/kv/mod.ts';
import {cache, defaults} from '@src/cache.ts';

export const pattern = '/:id([a-f\\d]{8}-[a-f\\d]{4}-7[a-f\\d]{3}-[a-f\\d]{4}-[a-f\\d]{12})?/';

// Get audio stream by Episode ID
export const GET: DinoHandle = async ({request, match}): Promise<Response> => {
  const error = new Response(null, {status: 404});
  const {id} = match.pathname.groups;
  if (!id) return error;
  const episode = await kv.getEpisode(id);
  if (!episode) return error;
  const response = await cache.fetch(episode.url, request, {
    ...structuredClone(defaults.audio)
  });
  // WebKit does not like this content type
  if (response.headers.get('content-type') === 'binary/octet-stream') {
    response.headers.set('content-type', 'audio/mpeg');
  }
  return response;
};
