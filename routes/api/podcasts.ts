import type { HyperHandle } from "@dbushell/hyperserve";
import type { APIData } from "@src/types.ts";
import * as kv from "@src/sqlite/mod.ts";
// import * as cache from "@src/cache/mod.ts";
import { syncEpisodes } from "@src/sync/episode.ts";
import { syncFeed } from "@src/sync/podcast.ts";
import { redirect } from "@src/utils/mod.ts";
// import { encodeHash } from "@src/utils/mod.ts";

const id = "[a-f\\d]{8}-[a-f\\d]{4}-4[a-f\\d]{3}-[a-f\\d]{4}-[a-f\\d]{12}";
export const pattern = `/:id(${id})?/:page(\\d+)?/`;

// Get all Podcasts with latest Episode
// Get single Podcast by ID with Episodes by page
export const GET: HyperHandle = async ({ match }): Promise<Response> => {
  const error = new Response(null, { status: 404 });
  const { id, page } = match.pathname.groups;
  // Get single Podcast with Episodes by page
  if (id) {
    const podcast = await kv.getPodcast(id);
    if (!podcast) return error;
    /** @todo Use latest episode hash? */
    // const hash = await encodeHash(
    //   id + page + podcast?.latestId + podcast?.apiCache,
    // );
    // `getEpisodesByPage` is slow use cache
    let rawJson = null; //await cache.pull(hash);
    if (!rawJson) {
      let index = Number.parseInt(page || "1");
      if (index < 2) index = 1;
      const episodes = await kv.getEpisodesByPage(id, 100, index - 1);
      const data: APIData = { podcasts: [{ ...podcast, episodes }] };
      rawJson = new TextEncoder().encode(JSON.stringify(data));
      // await cache.push(rawJson, {
      //   hash,
      //   contentType: "application/json",
      //   maxAge: 1000 * 60 * 60 * 24 * 30,
      // });
    }
    return new Response(rawJson, {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  }
  // Get all Podcasts with latest Episode
  const podcasts = await kv.getPodcasts();
  const data: APIData = { podcasts: [] };
  for (const podcast of podcasts) {
    const episode = await kv.getLatestEpisode(podcast.id);
    data.podcasts!.push({
      ...podcast,
      episodes: episode ? [episode] : [],
    });
  }
  return Response.json(data);
};

// Delete a Podcast by ID
export const DELETE: HyperHandle = async ({ match }): Promise<Response> => {
  const error = new Response(null, { status: 404 });
  const { id } = match.pathname.groups;
  if (!id) return error;
  const podcast = await kv.getPodcast(id);
  if (!podcast) return error;
  const result = await kv.deletePodcast(id);
  if (!result) return error;
  return Response.json(null, { status: 200 });
};

// Add new Podcast by URL
export const PUT: HyperHandle = async ({ request }): Promise<Response> => {
  const error = new Response(null, { status: 404 });
  const data = await request.formData();
  if (!data.has("url")) return error;
  const url = data.get("url")!.toString();
  // Check if Podcast already exists
  const podcast = await kv.getPodcastByURL(url);
  if (podcast) {
    return redirect(`/podcasts/${podcast.id}/`);
  }
  // Sync new Podcast feed
  try {
    const podcast = await syncFeed(new URL(url));
    await syncEpisodes(podcast);
    return redirect(`/podcasts/${podcast.id}/`);
  } catch {
    return error;
  }
};

// Delete existing or add new Podcast
export const POST: HyperHandle = async (args): Promise<Response> => {
  const error = new Response(null, {
    status: 302,
    headers: {
      location: "/settings/?error",
    },
  });
  // Delete Podcast by ID
  const { id } = args.match.pathname.groups;
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
