import type { HyperHandle } from "@dbushell/hyperserve";
import * as kv from "@src/kv/mod.ts";
import * as cache from "@src/cache/mod.ts";

const id = "[a-f\\d]{8}-[a-f\\d]{4}-4[a-f\\d]{3}-[a-f\\d]{4}-[a-f\\d]{12}";
export const pattern = `/:id(${id})/`;

// Get artwork image by Podcast ID
export const GET: HyperHandle = async (
  { request, match },
): Promise<Response> => {
  const error = new Response(null, { status: 404 });
  const { id } = match.pathname.groups;
  if (!id) return error;
  const podcast = await kv.getPodcast(id);
  if (!podcast) return error;
  return cache.fetch(new URL(podcast.image), request, {
    media: "image",
  });
};
