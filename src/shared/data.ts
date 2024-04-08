import type {APIData, AudioEntity} from '@src/types.ts';

/** Return `AudioEntity` from API bookmark data */
export const getBookmarkEntity = (
  bookmark: NonNullable<APIData['bookmarks']>[number]
): AudioEntity => {
  const {episode, podcast, artist, album, song} = bookmark;
  const entity: AudioEntity = {
    type: bookmark.ids.length === 3 ? 'audiobook' : 'podcast',
    ids: bookmark.ids,
    titles: [],
    duration: 0,
    bookmark
  };
  if (entity.type === 'podcast') {
    entity.titles = [podcast!.title, episode!.title];
    entity.duration = episode!.duration;
  } else {
    entity.titles = [artist!.title, album!.title, song!.title];
    entity.duration = song!.duration;
  }
  return entity;
};

/** Return `AudioEntity` from API data */
export const getDataEntity = (data: APIData): AudioEntity | null => {
  if (Array.isArray(data.episodes)) {
    const episode = data.episodes[0];
    const entity: AudioEntity = {
      type: 'podcast',
      ids: [episode.podcast.id, episode.id],
      titles: [episode.podcast.title, episode.title],
      duration: episode.duration,
      bookmark: episode.bookmark
    };
    return entity;
  }
  if (Array.isArray(data.songs)) {
    const artist = data.artists![0];
    const album = data.albums![0];
    const song = data.songs[0];
    const entity: AudioEntity = {
      type: 'audiobook',
      ids: [artist.id, album.id, song.id],
      titles: [artist.title, album.title, song.title],
      duration: song.duration,
      bookmark: song.bookmark
    };
    return entity;
  }
  return null;
};
