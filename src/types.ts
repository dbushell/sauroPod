export type Bookmark = {
  ids: Array<string>;
  /** Time listened up to (seconds) */
  position: number;
  date: Date;
};

export type Episode = {
  id: string;
  podcastId: string;
  date: Date;
  url: string;
  title: string;
  /** Audio duration (seconds) */
  duration: number;
  mimetype: string;
  played?: boolean;
  cached?: boolean;
};

export type Podcast = {
  id: string;
  modified: Date;
  url: string;
  title: string;
  image: string;
  /** Total number of episodes */
  count: number;
};

export type APIBookmark = {bookmark: Bookmark; episode?: Episode; podcast?: Podcast};

export type APIEpisode = {bookmark?: Bookmark; episode: Episode; podcast: Podcast};

export type APIPodcast = {podcast: Podcast; episodes: Array<Episode>};

export type APIData = {
  bookmarks?: Array<APIBookmark>;
  episodes?: Array<APIEpisode>;
  podcasts?: Array<APIPodcast>;
};

export type ServerData = APIData & {
  fragment?: boolean;
  bookmark?: Bookmark;
  episode?: Episode;
  podcast?: Podcast;
};

export type PublicData = {
  app: string;
  version: string;
  page?: number;
};
