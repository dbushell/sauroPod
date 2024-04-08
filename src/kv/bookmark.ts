/**
 * Bookmark KV module.
 * @module
 */
import type {Bookmark, Podcast} from '@src/types.ts';
import {db, isBookmark, isUUID} from './mod.ts';
import {newestSort} from '@src/shared/mod.ts';

/** Return all Bookmarks */
export const getBookmarks = async (): Promise<Array<Bookmark>> => {
  const list = db.list<Bookmark>({prefix: ['bookmark']});
  const bookmarks = await Array.fromAsync(list, ({value}) => value);
  newestSort<Bookmark>(bookmarks, 'date');
  return bookmarks;
};

/** Return all Bookmarks for a Podcast */
export const getBookmarksByPodcast = async (podcast: Podcast): Promise<Array<Bookmark>> => {
  const list = db.list<Bookmark>({prefix: ['bookmark', podcast.id]});
  const bookmarks = await Array.fromAsync(list, ({value}) => value);
  newestSort<Bookmark>(bookmarks, 'date');
  return bookmarks;
};

/** Return Bookmark by ID */
export const getBookmark = async (...ids: Array<string>): Promise<Bookmark | null> => {
  if (ids.find((id) => !isUUID(id))) throw new Error('Invalid UUID');
  const entry = await db.get<Bookmark>(['bookmark'].concat(ids));
  return entry.value;
};

/** Add new or update existing Bookmark */
export const setBookmark = async (data: Bookmark): Promise<boolean> => {
  if (!isBookmark(data)) throw new Error('Invalid Bookmark');
  const key = ['bookmark'].concat(data.ids);
  const entry = await db.get<Bookmark>(key);
  const result = await db.atomic().check(entry).set(key, data).commit();
  if (!result.ok) return false;
  const bookmark = await getBookmark(...data.ids);
  if (bookmark) {
    const event = entry.value ? 'bookmark:update' : 'bookmark:add';
    setTimeout(() => {
      dispatchEvent(new CustomEvent<Bookmark>(event, {detail: bookmark}));
    }, 0);
    return true;
  }
  return false;
};

/** Delete Bookmark by ID */
export const deleteBookmark = async (bookmark: Bookmark): Promise<boolean> => {
  if (!isBookmark(bookmark)) throw new Error('Invalid Bookmark');
  const key = ['bookmark'].concat(bookmark.ids);
  const entry = await db.get<Bookmark>(key);
  if (!entry.value) return false;
  const result = await db.atomic().check(entry).delete(key).commit();
  if (!result.ok) return false;
  const event = 'bookmark:delete';
  setTimeout(() => {
    dispatchEvent(new CustomEvent<Bookmark>(event, {detail: entry.value}));
  }, 0);
  return true;
};
