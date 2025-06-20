import * as ark from "arktype";

export const bookmark = ark.type({
  ids: ark.type("string.uuid").array(),
  /** Time listened up to (seconds) */
  position: "number",
  "positionFormat?": "string",
  progress: "number",
  date: "Date",
});

export type Bookmark = typeof bookmark.infer;

export const podcast = ark.type({
  id: "string.uuid",
  modified: "Date",
  "modifiedFormat?": "string",
  url: "string.url",
  title: "string",
  image: "string",
  /** Total number of episodes */
  count: "number",
  "latestId?": "string.uuid",
  /** Update to bust cache */
  "apiCache?": "Date",
});

export type Podcast = typeof podcast.infer;

export const episode = ark.type({
  id: "string.uuid",
  podcastId: "string.uuid",
  date: "Date",
  "dateFormat?": "string",
  url: "string.url",
  title: "string",
  /** Audio duration (seconds) */
  duration: "number",
  "durationFormat?": "string",
  mimetype: "string",
  "guid?": "string",
  "played?": "boolean",
});

export type Episode = typeof episode.infer;

export const artist = ark.type({
  id: "string.uuid",
  title: "string",
  path: "string",
  /** Total number of books */
  count: "number",
});

export type Artist = typeof artist.infer;

export const album = ark.type({
  id: "string.uuid",
  artistId: "string.uuid",
  title: "string",
  path: "string",
  /** Total number of songs */
  count: "number",
});

export type Album = typeof album.infer;

export const song = ark.type({
  id: "string.uuid",
  artistId: "string.uuid",
  albumId: "string.uuid",
  title: "string",
  path: "string",
  /** Audio duration (seconds) */
  duration: "number",
  "durationFormat?": "string",
  mimetype: "string",
});

export type Song = typeof song.infer;

export const meta = ark.type({
  key: "string > 0",
  value: "number|string",
  type: "'number'|'string'",
});

export type Meta = typeof meta.infer;
