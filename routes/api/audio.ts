import type { HyperHandle } from "@dbushell/hyperserve";
import { serveFile } from "@std/http";
import * as kv from "@src/sqlite/mod.ts";
import * as cache from "@src/cache/mod.ts";

const id = "[a-f\\d]{8}-[a-f\\d]{4}-4[a-f\\d]{3}-[a-f\\d]{4}-[a-f\\d]{12}";
export const pattern = `/:id(${id})+/`;

// Get audio stream by Episode ID
export const GET: HyperHandle = async (
  { request, match },
): Promise<Response> => {
  const error = new Response(null, { status: 404 });
  const { id } = match.pathname.groups;
  if (!id) return error;
  const ids = id.split("/");
  if (ids.length === 3) {
    // Serve audio by Song ID
    const song = await kv.getSong(ids[0], ids[1], ids[2]);
    if (!song) return error;
    const response = await serveFile(request, song.path);
    response.headers.set("content-type", song.mimetype);
    return response;
  }
  if (ids.length <= 2) {
    // Serve audio by Episode ID
    const episode = await kv.getEpisode(ids.at(-1)!);
    if (!episode) return error;
    const response = await cache.fetch(new URL(episode.url), request, {
      media: "audio",
    });
    // WebKit does not like this content type
    if (
      !response.headers.has("content-type") ||
      response.headers.get("content-type") === "binary/octet-stream"
    ) {
      response.headers.set("content-type", "audio/mpeg");
    }
    return response;
  }
  return error;
};
