/**
 * Artist KV module.
 * @module
 */
import type {Artist, Album, Song} from '@src/types.ts';
import {db, isUUID, isArtist, isAlbum, isSong} from './mod.ts';
import {naturalSort} from '@src/shared/mod.ts';

type Prefix = 'artist' | 'album' | 'song';
type Entity = Artist | Album | Song;

/** Get Media by IDs */
export const getMedias = async <T extends Entity>(
  prefix: Prefix,
  ...ids: Array<string>
): Promise<Array<T>> => {
  if (ids.some((id) => !isUUID(id))) throw new Error('Invalid ID');
  const list = db.list<T>({prefix: [prefix, ...ids]});
  const items = await Array.fromAsync(list, ({value}) => value);
  naturalSort<T>(items);
  return items;
};

/** Get Media by ID */
export const getMedia = async <T extends Entity>(
  prefix: Prefix,
  ...ids: Array<string>
): Promise<T | null> => {
  if (ids.some((id) => !isUUID(id))) throw new Error('Invalid ID');
  const entry = await db.get<T>([prefix, ...ids]);
  return entry.value;
};

/** Add new or update existing Media */
export const setMedia = async <T extends Entity>(prefix: Prefix, data: T) => {
  const key: Array<string> = [prefix];
  switch (prefix) {
    case 'artist':
      if (!isArtist(data as Artist)) throw new Error('Invalid Artist');
      break;
    case 'album':
      if (!isAlbum(data as Album)) throw new Error('Invalid Album');
      key.push((data as Album).artistId);
      break;
    case 'song':
      if (!isSong(data as Song)) throw new Error('Invalid Song');
      key.push((data as Song).artistId);
      key.push((data as Song).albumId);
      break;
  }
  key.push(data.id);
  const entry = await db.get<T>(key);
  const result = await db.atomic().check(entry).set(key, data).commit();
  if (!result.ok) return false;
  const entity = await getMedia<T>(prefix, ...key.slice(1));
  if (entity) {
    const event = prefix + (entry.value ? `:update` : ':add');
    setTimeout(() => {
      dispatchEvent(new CustomEvent<T>(event, {detail: entity}));
    }, 0);
    return true;
  }
  return false;
};

/** Delete Media by ID */
export const deleteMedia = async <T extends Entity>(prefix: Prefix, ...ids: Array<string>) => {
  if (ids.some((id) => !isUUID(id))) throw new Error('Invalid ID');
  const key = [prefix, ...ids];
  const entry = await db.get<T>(key);
  if (!entry.value) return false;
  const result = await db.atomic().check(entry).delete(key).commit();
  if (!result.ok) return false;
  const event = `${prefix}:delete`;
  setTimeout(() => {
    dispatchEvent(new CustomEvent<T>(event, {detail: entry.value!}));
  }, 0);
  return true;
};

/** Return all Artists */
export const getArtists = (id?: string): Promise<Array<Artist>> => {
  const ids = id ? [id] : [];
  return getMedias<Artist>('artist', ...ids);
};

/** Return single Artist by ID */
export const getArtist = (id: string): Promise<Artist | null> => {
  return getMedia<Artist>('artist', id);
};

/** Return all Albums, all Albums for Artist ID  */
export const getAlbums = (entity?: Artist | Album): Promise<Array<Album>> => {
  const ids: Array<string> = [];
  if (entity) {
    if ('artistId' in entity) ids.push(entity.artistId);
    ids.push(entity.id);
  }
  return getMedias<Album>('album', ...ids);
};

/** Retrun single Album by ID */
export const getAlbum = (artistId: string, id: string): Promise<Album | null> => {
  return getMedia<Album>('album', artistId, id);
};

/** Return all Songs, all Songs for Album ID, or single Song by ID */
export const getSongs = (entity?: Album | Song): Promise<Array<Song>> => {
  const ids: Array<string> = [];
  if (entity) {
    if ('artistId' in entity) ids.push(entity.artistId);
    if ('albumId' in entity) ids.push(entity.albumId);
    ids.push(entity.id);
  }
  return getMedias<Song>('song', ...ids);
};

/** Return single Song by ID */
export const getSong = (artistId: string, albumId: string, id: string): Promise<Song | null> => {
  return getMedia<Song>('song', artistId, albumId, id);
};
