import type { HyperHandle } from "@dbushell/hyperserve";
import type { APIData } from "@src/types.ts";
import * as kv from "@src/kv/mod.ts";

export const pattern = "/";

// Get all Artists
export const GET: HyperHandle = async (): Promise<Response> => {
  const artists = await kv.getArtists();
  const data: APIData = { artists };
  return Response.json(data);
};
