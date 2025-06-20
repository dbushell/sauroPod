import type {
  Album,
  Artist,
  Bookmark,
  Episode,
  Podcast,
  Song,
} from "./arktypes.ts";

export { Album, Artist, Bookmark, Episode, Podcast, Song };

export type AudioEntity = {
  type: "audiobook" | "podcast";
  ids: Array<string>;
  titles: Array<string>;
  duration: number;
  bookmark?: Bookmark;
};

export type SongEntry = Pick<Song, "title" | "path">;
export type AlbumEntry = Pick<Album, "title" | "path"> & {
  songs: Array<SongEntry>;
};
export type ArtistEntry = Pick<Artist, "title" | "path"> & {
  albums: Array<AlbumEntry>;
};

export type APIData = {
  bookmarks?: Array<
    Bookmark & {
      episode?: Episode;
      podcast?: Podcast;
      artist?: Artist;
      album?: Album;
      song?: Song;
    }
  >;
  episodes?: Array<Episode & { podcast: Podcast; bookmark?: Bookmark }>;
  podcasts?: Array<Podcast & { episodes?: Array<Episode> }>;
  artists?: Array<Artist>;
  albums?: Array<Album>;
  songs?: Array<Song & { bookmark?: Bookmark }>;
};

// export type ServerData = APIData & {
//   fragment?: boolean;
// };

// export type PublicData = {
//   app: string;
//   dev: boolean;
//   version: string;
//   page?: number;
// };

// export type Data = {
//   publicData: PublicData;
//   serverData: ServerData;
// };

export type CacheOptions = {
  maxAge?: number;
  media?: "audio" | "image" | "json" | "rss";
  prefetch?: boolean;
};

export type CacheItem = {
  hash: string;
  options: CacheOptions;
  url: string;
};

export type OfflineDownload = {
  contentLength: number;
  contentSize: number;
  progress: number;
};

export type OfflineStore = {
  cached: Set<string>;
  downloads: Map<string, OfflineDownload>;
  usage: number;
  quota: number;
};

export type Deferred<T> = ReturnType<typeof Promise.withResolvers<T>>;
