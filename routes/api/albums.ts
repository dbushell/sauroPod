import type {DinoHandle} from 'dinossr';
import type {APIData} from '@src/types.ts';
import * as kv from '@src/kv/mod.ts';

const id = '[a-f\\d]{8}-[a-f\\d]{4}-4[a-f\\d]{3}-[a-f\\d]{4}-[a-f\\d]{12}';

export const pattern = `/:id(${id})/`;

// Get all Albums by Artist ID
export const GET: DinoHandle = async ({match}): Promise<Response> => {
  const error = new Response(null, {status: 404});
  const {id} = match.pathname.groups;
  if (!id) return error;
  const artist = await kv.getArtist(id);
  if (!artist) return error;
  const albums = await kv.getAlbums(artist);
  const data: APIData = {artists: [artist], albums};
  return Response.json(data);
};
