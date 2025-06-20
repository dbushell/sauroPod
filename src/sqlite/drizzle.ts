import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql/node";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const bookmarkTable = sqliteTable("bookmarks", {
  ids: text().notNull(),
  position: integer().notNull(),
  // positionFormat: text(),
  progress: integer().notNull(),
  date: text().notNull(),
});

export const podcastTable = sqliteTable("podcasts", {
  id: text().primaryKey().notNull(),
  modified: text().notNull(),
  // modifiedFormat: text(),
  url: text().notNull(),
  title: text().notNull(),
  image: text().notNull(),
  count: integer().notNull(),
  latestId: text(),
  apiCache: text(),
});

export const episodeTable = sqliteTable("episodes", {
  id: text().primaryKey().notNull(),
  podcastId: text().references(() => podcastTable.id).notNull(),
  date: text().notNull(),
  url: text().notNull(),
  title: text().notNull(),
  duration: integer().notNull(),
  mimetype: text().notNull(),
  guid: text(),
  played: integer(),
});

export const artistTable = sqliteTable("artists", {
  id: text().primaryKey().notNull(),
  title: text().notNull(),
  path: text().notNull(),
  count: integer().notNull(),
});

export const albumTable = sqliteTable("albums", {
  id: text().primaryKey().notNull(),
  artistId: text().references(() => artistTable.id).notNull(),
  title: text().notNull(),
  path: text().notNull(),
  count: integer().notNull(),
});

export const songTable = sqliteTable("songs", {
  id: text().primaryKey().notNull(),
  artistId: text().references(() => artistTable.id).notNull(),
  albumId: text().references(() => albumTable.id).notNull(),
  title: text().notNull(),
  path: text().notNull(),
  duration: integer().notNull(),
  // durationFormat: text(),
  mimetype: text().notNull(),
});

export const metaTable = sqliteTable("meta", {
  key: text().primaryKey().notNull(),
  value: text().notNull(),
  type: text().notNull(),
});

const client = createClient({
  url: Deno.env.get("APP_DATA_URL") ??
    `file://${Deno.cwd()}/.data/sauropod.sqlite`,
});

export const db = drizzle(client);

await db.run("PRAGMA journal_mode = WAL;");
await db.run("PRAGMA foreign_keys = ON;");
