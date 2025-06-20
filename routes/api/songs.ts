import type { HyperHandle } from "@dbushell/hyperserve";
import type { APIData, Song } from "@src/types.ts";
import * as kv from "@src/sqlite/mod.ts";

const id = "[a-f\\d]{8}-[a-f\\d]{4}-4[a-f\\d]{3}-[a-f\\d]{4}-[a-f\\d]{12}";
export const pattern = `/:artistId(${id})/:albumId(${id})/:songId(${id})?/`;

// Get all or single Song(s) by Album and Artist ID
export const GET: HyperHandle = async ({ match }): Promise<Response> => {
  const error = new Response(null, { status: 404 });
  const { artistId, albumId, songId } = match.pathname.groups;
  if (!artistId || !albumId) return error;
  const artist = await kv.getArtist(artistId);
  if (!artist) return error;
  const album = await kv.getAlbum(artistId, albumId);
  if (!album) return error;
  const songs: Song[] = [];
  if (songId) {
    // Get single Song by ID
    const song = await kv.getSong(artistId, albumId, songId);
    if (!song) return error;
    songs.push(song);
  } else {
    // Get all Songs by Album
    songs.push(...(await kv.getSongs(album)));
  }
  const data: APIData = { artists: [artist], albums: [album], songs };
  if (songId) {
    // Add Bookmark to single Song
    const bookmark = await kv.getBookmark(artist.id, album.id, songs[0].id);
    if (bookmark) {
      data.songs![0].bookmark = bookmark;
    }
  }
  return Response.json(data);
};
