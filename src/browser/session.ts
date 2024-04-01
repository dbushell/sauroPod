/**
 * Client-side script for dynamic Media Session API integration.
 * @module
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API}
 * @see {@link https://dbushell.com/2023/03/20/ios-pwa-media-session-api/}
 * @see {@link https://dbushell.com/2024/04/02/offscreen-canvas-and-web-workers/}
 */
/// <reference lib="DOM"/>
import type {Episode, Podcast} from '@src/types.ts';

/** Generate an image and return Blob URL and type */
const createImage = async (
  size: number,
  image: HTMLImageElement
): Promise<[string, string] | null> => {
  const uid = `artwork-${size}-${size}`;
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await canvas.convertToBlob({type: 'image/png'});
  URL.revokeObjectURL(localStorage.getItem(uid) ?? '');
  if (!blob) null;
  const url = URL.createObjectURL(blob);
  localStorage.setItem(uid, url);
  return [url, blob.type];
};

/** Update media session with dynamic images */
const setMetadata = async (title: string, artist: string, image: HTMLImageElement) => {
  const images = {
    '96': await createImage(96, image),
    '256': await createImage(256, image),
    '512': await createImage(512, image)
  };
  const artwork: MediaImage[] = [];
  for (const [size, image] of Object.entries(images)) {
    if (!image) continue;
    artwork.push({
      src: image[0],
      type: image[1],
      sizes: `${size}x${size}`
    });
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist,
    artwork
  });
};

/** Update media session with currently playing */
export const setMediaSession = (podcast: Podcast, episode: Episode) => {
  const title = episode.title;
  const artist = podcast.title;
  const image = new Image();
  image.src = new URL(`/api/artwork/${podcast.id}/`, globalThis.location.origin).href;
  image.addEventListener('load', () => setMetadata(title, artist, image));
  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist
  });
};
