/**
 * @typedef {import('@src/types.ts').APIData} APIData
 * @typedef {import('@src/types.ts').AudioEntity} AudioEntity
 */

/**
 * View transition with fallback
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition}
 */
export const viewTransition = typeof document.startViewTransition === "function"
  ? (props) => document.startViewTransition(props)
  : (props) => ({
    finished: Promise.resolve(props()),
  });

/**
 * Format unix timestamp to `hh:mm:ss`
 * @param {string | number} seconds
 * @returns {string}
 */
export const formatTime = (seconds) => {
  seconds = Number.parseInt(String(seconds), 10);
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor(seconds / 60) % 60).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`.replace(/^00:/, "");
};

/**
 * Format bytes with nearest unit
 * @param {number} bytes
 * @returns {string}
 */
export const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * Return audio entity from data
 * @param {APIData} data
 * @returns {AudioEntity | null}
 */
export const getDataEntity = (data) => {
  if (!data) return null;
  if (Array.isArray(data.episodes)) {
    const episode = data.episodes[0];
    /** @type {AudioEntity} */
    const entity = {
      type: "podcast",
      ids: [episode.podcast.id, episode.id],
      titles: [episode.podcast.title, episode.title],
      duration: episode.duration,
      bookmark: episode.bookmark,
    };
    return entity;
  }
  if (Array.isArray(data.songs)) {
    const artist = data.artists[0];
    const album = data.albums[0];
    const song = data.songs[0];
    /** @type {AudioEntity} */
    const entity = {
      type: "audiobook",
      ids: [artist.id, album.id, song.id],
      titles: [artist.title, album.title, song.title],
      duration: song.duration,
      bookmark: song.bookmark,
    };
    return entity;
  }
  return null;
};
