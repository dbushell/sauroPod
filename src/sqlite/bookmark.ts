/**
 * Bookmark SQLite module.
 * @module
 */
import { ark } from "arktype";
import * as dz from "drizzle-orm";
import { type Bookmark, bookmark, type Podcast } from "@src/arktypes.ts";
import { bookmarkTable, db } from "./drizzle.ts";

type BookmarkData = typeof bookmarkTable.$inferSelect;

/** Convert sqlite data to arktype */
const fromData = (data: BookmarkData): Bookmark => {
  return {
    ...data,
    ids: data.ids.split("/"),
    date: new Date(data.date),
  };
};

/* Convert arktype to sqlite data */
const toData = (data: Bookmark): BookmarkData => {
  return {
    ...data,
    ids: data.ids.join("/"),
    date: data.date.toISOString(),
  };
};

/** Return all Podcasts */
export const getBookmarks = async (): Promise<Array<Bookmark>> => {
  const bookmarks = await db
    .select()
    .from(bookmarkTable)
    .orderBy(dz.desc(bookmarkTable.date))
    .all();
  return bookmarks.map(fromData);
};

/** Return all Bookmarks for a Podcast */
export const getBookmarksByPodcast = async (
  podcast: Podcast,
): Promise<Array<Bookmark>> => {
  const bookmarks = await db
    .select()
    .from(bookmarkTable)
    .orderBy(dz.desc(bookmarkTable.date))
    .where(dz.like(bookmarkTable.ids, `%${podcast.id}%`))
    .all();
  return bookmarks.map(fromData);
};

/** Return Bookmark by ID */
export const getBookmark = async (
  ...ids: Array<string>
): Promise<Bookmark | null> => {
  for (const id of ids) {
    const validate = ark.type("string.uuid")(id);
    if (validate instanceof ark.type.errors) {
      throw new Error(validate.summary);
    }
  }
  const bookmarks = await db
    .select()
    .from(bookmarkTable)
    .orderBy(dz.desc(bookmarkTable.date))
    .where(dz.eq(bookmarkTable.ids, ids.join("/")))
    .all();
  if (bookmarks.length) {
    return fromData(bookmarks[0]);
  }
  return null;
};

/** Add new or update existing Bookmark */
export const setBookmark = async (data: Bookmark): Promise<boolean> => {
  const validate = bookmark(data);
  if (validate instanceof ark.type.errors) {
    throw new Error(validate.summary);
  }
  const dbData = toData(data);
  const existing = await getBookmark(...data.ids);
  if (existing) {
    await db
      .update(bookmarkTable)
      .set(dbData)
      .where(dz.eq(bookmarkTable.ids, dbData.ids))
      .run();
  } else {
    await db
      .insert(bookmarkTable)
      .values(dbData)
      .run();
  }
  const event = existing ? "bookmark:update" : "bookmark:add";
  setTimeout(() => {
    dispatchEvent(new CustomEvent<Bookmark>(event, { detail: data }));
  }, 0);
  return true;
};

/** Delete Bookmark by ID */
export const deleteBookmark = async (data: Bookmark): Promise<boolean> => {
  const validate = bookmark(data);
  if (validate instanceof ark.type.errors) {
    throw new Error(validate.summary);
  }
  const existing = await getBookmark(...data.ids);
  if (!existing) return false;
  await db
    .delete(bookmarkTable)
    .where(dz.eq(bookmarkTable.ids, data.ids.join("/")))
    .run();
  setTimeout(() => {
    dispatchEvent(
      new CustomEvent<Bookmark>("bookmark:delete", { detail: existing }),
    );
  }, 0);
  return true;
};
