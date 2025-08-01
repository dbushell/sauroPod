/**
 * Media KV module.
 * @module
 */
import * as ark from "arktype";
import * as dz from "drizzle-orm";
import {
  type Album,
  album,
  type Artist,
  artist,
  type Song,
  song,
} from "@src/arktypes.ts";
import { albumTable, artistTable, db, songTable } from "./drizzle.ts";
import { naturalSort } from "@src/utils/mod.ts";

type Prefix = "artist" | "album" | "song";
type Entity = Artist | Album | Song;

/** @todo refactor? */
/** Add new or update existing Media */
export const setMedia = async <T extends Entity>(prefix: Prefix, data: T) => {
  let existing: T | null = null;
  switch (prefix) {
    case "artist": {
      const entity = artist(data);
      if (entity instanceof ark.type.errors) {
        throw new Error(entity.summary);
      }
      existing = await getArtist(entity.id) as T;
      break;
    }
    case "album": {
      const entity = album(data);
      if (entity instanceof ark.type.errors) {
        throw new Error(entity.summary);
      }
      existing = await getAlbum(entity.artistId, data.id) as T;
      break;
    }
    case "song": {
      const entity = song(data);
      if (entity instanceof ark.type.errors) {
        throw new Error(entity.summary);
      }
      existing = await getSong(entity.artistId, entity.albumId, data.id) as T;
      break;
    }
  }
  if (existing) {
    await db
      .update(getTable(prefix))
      .set(data)
      .where(dz.eq(getIdColumn(prefix), data.id))
      .run();
  } else {
    await db
      .insert(getTable(prefix))
      .values(data)
      .run();
  }
  const event = `${prefix}:${existing ? "update" : "add"}`;
  setTimeout(() => {
    dispatchEvent(new CustomEvent<T>(event, { detail: data }));
  }, 0);
  return true;
};

/** Delete Media by ID */
export const deleteMedia = async (
  prefix: Prefix,
  ...ids: Array<string>
) => {
  for (const id of ids) {
    const validate = ark.type("string.uuid")(id);
    if (validate instanceof ark.type.errors) {
      throw new Error(validate.summary);
    }
  }
  let entry: Entity | null = null;
  if (prefix === "song") {
    entry = await getSong(ids[0], ids[1], ids[2]);
    if (!entry) return false;
    await db
      .delete(songTable)
      .where(dz.eq(songTable.id, ids[2]))
      .run();
  }
  if (prefix === "album") {
    entry = await getAlbum(ids[0], ids[1]);
    if (!entry) return false;
    for (const song of await getSongs(entry as Album)) {
      await deleteMedia("song", song.artistId, song.albumId, song.id);
    }
    await db
      .delete(albumTable)
      .where(dz.eq(albumTable.id, ids[1]))
      .run();
  }
  if (prefix === "artist") {
    entry = await getArtist(ids[0]);
    if (!entry) return false;
    for (const album of await getAlbums(entry)) {
      await deleteMedia("album", album.artistId, album.id);
    }
    await db
      .delete(artistTable)
      .where(dz.eq(artistTable.id, ids[0]))
      .run();
  }
  if (!entry) return false;
  const event = `${prefix}:delete`;
  setTimeout(() => {
    dispatchEvent(new CustomEvent<Entity>(event, { detail: entry }));
  }, 0);
  return true;
};

/** Return all Artists */
export const getArtists = async (): Promise<Array<Artist>> => {
  const items = await db
    .select()
    .from(artistTable)
    .all();
  naturalSort<Artist>(items);
  return items;
};

/** Return single Artist by ID */
export const getArtist = async (id: string): Promise<Artist | null> => {
  const validate = ark.type("string.uuid")(id);
  if (validate instanceof ark.type.errors) {
    throw new Error(validate.summary);
  }
  const entry = await db
    .select()
    .from(artistTable)
    .where(dz.eq(artistTable.id, id))
    .limit(1)
    .all();
  return entry[0] ?? null;
};

/** Return all Albums, all Albums for Artist ID */
export const getAlbums = async (
  entity?: Artist | Album,
): Promise<Array<Album>> => {
  let where = undefined;
  if (entity) {
    if ("artistId" in entity) {
      where = dz.eq(albumTable.id, entity.id);
    } else {
      where = dz.eq(albumTable.artistId, entity.id);
    }
  }
  const items = await db
    .select()
    .from(albumTable)
    .where(where)
    .all();
  naturalSort<Album>(items);
  return items;
};

/** Return single Album by ID */
export const getAlbum = async (
  artistId: string,
  id: string,
): Promise<Album | null> => {
  const validate = ark.type("string.uuid")(id);
  if (validate instanceof ark.type.errors) {
    throw new Error(validate.summary);
  }
  const entry = await db
    .select()
    .from(albumTable)
    .where(dz.and(
      dz.eq(albumTable.id, id),
      dz.eq(albumTable.artistId, artistId),
    ))
    .limit(1)
    .all();
  return entry[0] ?? null;
};

/** Return all Songs, all Songs for Album ID, or single Song by ID */
export const getSongs = async (entity?: Album | Song): Promise<Array<Song>> => {
  let where = undefined;
  if (entity) {
    if ("albumId" in entity) {
      where = dz.eq(songTable.id, entity.id);
    } else {
      where = dz.eq(songTable.albumId, entity.id);
    }
  }
  const items = await db
    .select()
    .from(songTable)
    .where(where)
    .all();
  naturalSort<Song>(items);
  return items;
};

/** Return single Song by ID */
export const getSong = async (
  artistId: string,
  albumId: string,
  id: string,
): Promise<Song | null> => {
  const validate = ark.type("string.uuid")(id);
  if (validate instanceof ark.type.errors) {
    throw new Error(validate.summary);
  }
  const entry = await db
    .select()
    .from(songTable)
    .where(dz.and(
      dz.eq(songTable.id, id),
      dz.eq(songTable.albumId, albumId),
      dz.eq(songTable.artistId, artistId),
    ))
    .limit(1)
    .all();
  return entry[0] ?? null;
};

const getTable = (prefix: Prefix) => {
  switch (prefix) {
    case "artist":
      return artistTable;
    case "album":
      return albumTable;
    case "song":
      return songTable;
  }
};

const getIdColumn = (prefix: Prefix) => {
  switch (prefix) {
    case "artist":
      return artistTable.id;
    case "album":
      return albumTable.id;
    case "song":
      return songTable.id;
  }
};
