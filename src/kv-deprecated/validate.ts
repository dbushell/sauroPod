/**
 * Data validation module.
 * @module
 */
import type { Album, Artist, Song } from "@src/types.ts";
import type { Bookmark, Episode, Podcast } from "@src/types.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate a possible UUID value
 * @see {@link https://jsr.io/@std/uuid/1.0.0/v4.ts}
 */
export const isUUID = (value: string): boolean => {
  return UUID_RE.test(value);
};

/** Validate a possible URL value */
export const isURL = (value: string | URL, strict = true): boolean => {
  try {
    if (strict && !(value instanceof URL)) {
      return false;
    }
    const url = new URL(value);
    // Only work with HTTP
    if (url.protocol.startsWith("http")) {
      return true;
    }
  } catch {
    return false;
  }
  return true;
};

/** Validate a possible Date value */
export const isDate = (value: string | Date, strict = true): boolean => {
  try {
    if (strict && !(value instanceof Date)) {
      return false;
    }
    const date = new Date(value);
    // Allow historic publications
    if (date.getFullYear() < 1970) {
      return false;
    }
    // Be lenient for future scheduled publications
    if (date.getFullYear() > new Date().getFullYear() + 2) {
      return false;
    }
  } catch {
    return false;
  }
  return true;
};

/** Validate a Bookmark object */
export const isBookmark = (data: Bookmark): boolean => {
  if (data.ids.find((id) => !isUUID(id))) return false;
  if (!isDate(data.date)) return false;
  if (!Number.isFinite(data.position) || data.position < 0) return false;
  return true;
};

/** Validate an Episode object */
export const isEpisode = (data: Episode): boolean => {
  if (!isUUID(data.id)) return false;
  if (!isUUID(data.podcastId)) return false;
  if (!isURL(data.url, false)) return false;
  if (!isDate(data.date)) return false;
  if (data.duration < 0) return false;
  return true;
};

/** Validate a Podcast object */
export const isPodcast = (data: Podcast): boolean => {
  if (!isUUID(data.id)) return false;
  if (!isURL(data.url, false)) return false;
  return true;
};

/** Validate an Artist object */
export const isArtist = (data: Artist): boolean => {
  if (!isUUID(data.id)) return false;
  if (data.count < 0) return false;
  return true;
};

/** Validate an Album object */
export const isAlbum = (data: Album): boolean => {
  if (!isUUID(data.id)) return false;
  if (!isUUID(data.artistId)) return false;
  if (data.count < 0) return false;
  return true;
};

/** Validate a Song object */
export const isSong = (data: Song): boolean => {
  if (!isUUID(data.id)) return false;
  if (!isUUID(data.artistId)) return false;
  if (!isUUID(data.albumId)) return false;
  if (data.duration < 0) return false;
  return true;
};
