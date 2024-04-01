import type {DinoHandle} from 'dinossr';
import type {APIData} from '@src/types.ts';
import * as kv from '@src/kv/mod.ts';

export const pattern = '/:id([a-f\\d]{8}-[a-f\\d]{4}-7[a-f\\d]{3}-[a-f\\d]{4}-[a-f\\d]{12})?/';

// Delete a Bookmark by Episode ID
export const DELETE: DinoHandle = async ({match}): Promise<Response> => {
  const error = new Response(null, {status: 404});
  const {id} = match.pathname.groups;
  if (!id) return error;
  const episode = await kv.getEpisode(id);
  if (!episode) return error;
  const bookmark = await kv.getBookmark(episode.podcastId, episode.id);
  if (!bookmark) return error;
  const result = await kv.deleteBookmark(bookmark);
  if (!result) return error;
  return Response.json(null, {status: 200});
};

// Get all Bookmarks
// Get all Bookmarks by Podcast ID
// Get single Bookmark by Episode ID
export const GET: DinoHandle = async ({match}): Promise<Response> => {
  const error = new Response(null, {status: 404});
  const {id} = match.pathname.groups;
  if (id) {
    {
      // Get all Bookmarks for Podcast
      const podcast = await kv.getPodcast(id);
      if (podcast) {
        const bookmarks = await kv.getBookmarksByPodcast(podcast);
        const data: APIData = {
          bookmarks: bookmarks.map((bookmark) => ({bookmark}))
        };
        return Response.json(data);
      }
    }
    // Get single Bookmark for Episode
    const episode = await kv.getEpisode(id);
    if (!episode) return error;
    const podcast = await kv.getPodcast(episode.podcastId);
    if (!podcast) return error;
    const bookmark = await kv.getBookmark(podcast.id, episode.id);
    if (!bookmark) return error;
    const data: APIData = {
      bookmarks: [{bookmark, episode, podcast}]
    };
    return Response.json(data);
  }
  // Get all Bookmarks
  const bookmarks = await kv.getBookmarks();
  const data: APIData = {
    bookmarks: []
  };
  for (const bookmark of bookmarks) {
    const podcast = await kv.getPodcast(bookmark.ids[0]);
    if (!podcast) continue;
    const episode = await kv.getEpisode(bookmark.ids[1]);
    if (!episode) continue;
    data.bookmarks!.push({
      bookmark,
      episode,
      podcast
    });
  }
  return Response.json(data);
};

// Add or update a Bookmark by Episode & Podcast ID
export const PUT: DinoHandle = async ({request}): Promise<Response> => {
  const error = new Response(null, {status: 404});
  const data = await request.json();
  const result = await kv.setBookmark({
    ...data,
    date: new Date(data.date)
  });
  if (!result) return error;
  // Update Episode played status
  const episode = await kv.getEpisode(data.ids[1]);
  if (episode) {
    await kv.setEpisode({
      ...episode,
      played: data.position > episode.duration * 0.1
    });
  }
  return Response.json(null, {status: 201});
};
