import type {DinoHandle} from 'dinossr';
import type {APIData} from '@src/types.ts';
import * as kv from '@src/kv/mod.ts';
import * as sync from '@src/sync/mod.ts';
import {redirect} from '@src/shared/mod.ts';

const id = '[a-f\\d]{8}-[a-f\\d]{4}-7[a-f\\d]{3}-[a-f\\d]{4}-[a-f\\d]{12}';
export const pattern = `/:id(${id})?/:page(\\d+)?/`;

// Get all Podcasts with latest Episode
// Get single Podcast by ID with Episodes by page
export const GET: DinoHandle = async ({match}): Promise<Response> => {
  const error = new Response(null, {status: 404});
  const {id, page} = match.pathname.groups;
  // Get single Podcast with Episodes by page
  if (id) {
    const podcast = await kv.getPodcast(id);
    if (!podcast) return error;
    let index = Number.parseInt(page || '1');
    if (index < 2) index = 1;
    const episodes = await kv.getEpisodesByPage(id, 100, index - 1);
    const data: APIData = {podcasts: [{...podcast, episodes}]};
    return Response.json(data);
  }
  // Get all Podcasts with latest Episode
  const podcasts = await kv.getPodcasts();
  const data: APIData = {podcasts: []};
  for (const podcast of podcasts) {
    const episode = await kv.getLatestEpisode(podcast.id);
    data.podcasts!.push({
      ...podcast,
      episodes: episode ? [episode] : []
    });
  }
  return Response.json(data);
};

// Delete a Podcast by ID
export const DELETE: DinoHandle = async ({match}): Promise<Response> => {
  const error = new Response(null, {status: 404});
  const {id} = match.pathname.groups;
  if (!id) return error;
  const podcast = await kv.getPodcast(id);
  if (!podcast) return error;
  const result = await kv.deletePodcast(id);
  if (!result) return error;
  return Response.json(null, {status: 200});
};

// Add new Podcast by URL
export const PUT: DinoHandle = async ({request}): Promise<Response> => {
  const error = new Response(null, {status: 404});
  const data = await request.formData();
  if (!data.has('url')) return error;
  const url = data.get('url')!.toString();
  // Check if Podcast already exists
  const podcast = await kv.getPodcastByURL(url);
  if (podcast) {
    return redirect(`/podcasts/${podcast.id}/`);
  }
  // Sync new Podcast feed
  try {
    const podcast = await sync.syncFeed(new URL(url));
    sync.syncEpisodes(podcast);
    return redirect(`/podcasts/${podcast.id}/`);
  } catch {
    return error;
  }
};

// Delete existing or add new Podcast
export const POST: DinoHandle = async (args): Promise<Response> => {
  const error = new Response(null, {
    status: 302,
    headers: {
      location: '/settings/?error'
    }
  });
  // Delete Podcast by ID
  const {id} = args.match.pathname.groups;
  if (id) {
    const response = await DELETE(args);
    if (response instanceof Response && response.ok) {
      return redirect(`/settings/`);
    }
    return error;
  }
  // Add Podcast by URL
  const response = await PUT(args);
  if (response instanceof Response && response.status < 400) {
    return response;
  }
  return error;
};
