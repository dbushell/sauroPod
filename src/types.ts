export type Bookmark = {
  ids: Array<string>;
  /** Time listened up to (seconds) */
  position: number;
  positionFormat?: string;
  progress?: number;
  date: Date;
};

export type Episode = {
  id: string;
  podcastId: string;
  date: Date;
  dateFormat?: string;
  url: string;
  title: string;
  /** Audio duration (seconds) */
  duration: number;
  durationFormat?: string;
  mimetype: string;
  guid?: string;
  played?: boolean;
};

export type Podcast = {
  id: string;
  modified: Date;
  modifiedFormat?: string;
  url: string;
  title: string;
  image: string;
  /** Total number of episodes */
  count: number;
  latestId: string;
  /** Update to bust cache */
  apiCache: Date;
};

export type Artist = {
  id: string;
  title: string;
  path: string;
  /** Total number of books */
  count: number;
};

export type Album = {
  id: string;
  artistId: string;
  title: string;
  path: string;
  /** Total number of songs */
  count: number;
};

export type Song = {
  id: string;
  artistId: string;
  albumId: string;
  title: string;
  path: string;
  /** Audio duration (seconds) */
  duration: number;
  durationFormat?: string;
  mimetype: string;
};

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
