import type {DinoHandle} from 'dinossr';
import type {APIData} from '@src/types.ts';
import * as kv from '@src/kv/mod.ts';

export const pattern = '/:id([a-f\\d]{8}-[a-f\\d]{4}-7[a-f\\d]{3}-[a-f\\d]{4}-[a-f\\d]{12})?/';

// Get single Episode by ID with Bookmark and Podcast
export const GET: DinoHandle = async ({match}): Promise<Response> => {
  const error = new Response(null, {status: 404});
  const {id} = match.pathname.groups;
  if (!id) return error;
  const episode = await kv.getEpisode(id);
  if (!episode) return error;
  const podcast = await kv.getPodcast(episode.podcastId);
  if (!podcast) return error;
  const data: APIData = {episodes: [{episode, podcast}]};
  const bookmark = await kv.getBookmark(podcast.id, episode.id);
  if (bookmark) {
    data.episodes![0].bookmark = bookmark;
  }
  return Response.json(data);
};
