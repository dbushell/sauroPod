/**
 * Media sync module.
 * @module
 */
import type {ArtistEntry, AlbumEntry, SongEntry} from '@src/types.ts';
import type {Artist, Album, Song} from '@src/types.ts';
import {log} from '@src/log.ts';
import * as path from '@std/path';
import {duration as audioDuration} from '@dbushell/audio-duration';
import * as db from '@src/kv/mod.ts';

/** File extensions to consider as audio when syncing media */
const EXTENSIONS = ['mp3', 'mp4', 'm4a', 'm4b'];

/** Directory names must begin with `[A-Za-z0-9_]` character class */
const DIR = /^\w/;

// File names must end with extension and not begin "." or "_"
const FILE = new RegExp(`^(?!\\.|_).*\\.(${EXTENSIONS.join('|')})$`);

const mediaPath = Deno.env.get('APP_MEDIA_PATH') ?? path.join(Deno.cwd(), './.media');

const checkMediaPath = () => {
  try {
    const stat = Deno.statSync(mediaPath);
    if (!stat.isDirectory) throw new Error();
  } catch {
    return false;
  }
  return true;
};

if (!checkMediaPath()) {
  log.warn(`Media not found: "${mediaPath}"`);
}

/** Return list of matching directories in path */
const getDirs = async (root: string) => {
  const paths = [];
  for await (const entry of Deno.readDir(root)) {
    if (entry.isDirectory && DIR.test(entry.name)) {
      paths.push(path.join(root, entry.name));
    }
  }
  return paths;
};

/** Return list of matching files in path */
const getFiles = async (root: string) => {
  const paths = [];
  for await (const entry of Deno.readDir(root)) {
    if (entry.isFile && FILE.test(entry.name)) {
      paths.push(path.join(root, entry.name));
    }
  }
  return paths;
};

const mapSongs = (entry: string): SongEntry => ({
  path: entry,
  title: path.parse(entry).name
});

const mapAlbums = async (entry: string): Promise<AlbumEntry> => ({
  path: entry,
  title: path.basename(entry),
  songs: await Promise.all((await getFiles(entry)).map(mapSongs))
});

const mapArtists = async (entry: string): Promise<ArtistEntry> => ({
  path: entry,
  title: path.basename(entry),
  albums: await Promise.all((await getDirs(entry)).map(mapAlbums))
});

const mapMedia = async (root: string): Promise<Array<ArtistEntry>> => {
  return Promise.all((await getDirs(root)).map(mapArtists));
};

/** Find or add Artist to database */
export const ensureArtist = async (entry: ArtistEntry, artists: Array<Artist>) => {
  let artist = artists.find((a) => a.title === entry.title && a.path === entry.path);
  if (artist) return artist;
  artist = {
    id: db.uuid(),
    title: entry.title,
    path: entry.path,
    count: 0
  };
  const result = await db.setMedia<Artist>('artist', artist);
  if (result) return artist;
  throw new Error(`Artist "${entry.path}"`);
};

/** Find or add Album to database */
export const ensureAlbum = async (entry: AlbumEntry, albums: Album[], artist: Artist) => {
  let album = albums.find((a) => a.title === entry.title && a.path === entry.path);
  if (album) return album;
  album = {
    id: db.uuid(),
    artistId: artist.id,
    title: entry.title,
    path: entry.path,
    count: 0
  };
  const result = await db.setMedia<Album>('album', album);
  if (result) return album;
  throw new Error(`Album "${entry.path}"`);
};

/** Find or add Song to database */
export const ensureSong = async (entry: SongEntry, songs: Song[], artist: Artist, album: Album) => {
  let song = songs.find((s) => s.title === entry.title && s.path === entry.path);
  if (song) return song;
  try {
    const duration = (await audioDuration(entry.path)) / 1000;
    const mimetype = path.extname(entry.path) === '.mp3' ? 'audio/mpeg' : 'audio/mp4';
    if (!duration) {
      throw new Error(`Duration "${entry.path}"`);
    }
    song = {
      id: db.uuid(),
      artistId: artist.id,
      albumId: album.id,
      title: entry.title,
      path: entry.path,
      duration,
      mimetype
    };
    const result = await db.setMedia<Song>('song', song);
    if (result) return song;
    throw new Error(`Song "${entry.path}"`);
  } catch (err) {
    log.error(err);
  }
};

export const syncMedia = async () => {
  if (!checkMediaPath()) return;
  const now = performance.now();
  const artists = await db.getArtists();
  const media = await mapMedia(mediaPath);
  for (const entry of media) {
    const artist = await ensureArtist(entry, artists);
    const albums = await db.getAlbums(artist);
    for (const albumEntry of entry.albums) {
      const album = await ensureAlbum(albumEntry, albums, artist);
      const songs = await db.getSongs(album);
      for (const songEntry of albumEntry.songs) {
        await ensureSong(songEntry, songs, artist, album);
      }
      if (album.count !== songs.length) {
        album.count = songs.length;
        await db.setMedia<Artist>('album', album);
      }
    }
    if (artist.count !== albums.length) {
      artist.count = albums.length;
      await db.setMedia<Artist>('artist', artist);
    }
  }
  for (const artist of await db.getArtists()) {
    try {
      const stat = await Deno.lstat(artist.path);
      if (!stat.isDirectory) throw new Error();
    } catch {
      await db.deleteMedia<Artist>('artist', artist.id);
    }
  }
  for (const album of await db.getAlbums()) {
    try {
      const stat = await Deno.lstat(album.path);
      if (!stat.isDirectory) throw new Error();
    } catch {
      await db.deleteMedia<Album>('album', album.artistId, album.id);
    }
  }
  for (const song of await db.getSongs()) {
    try {
      const stat = await Deno.lstat(song.path);
      if (!stat.isFile) throw new Error();
    } catch {
      await db.deleteMedia<Song>('song', song.artistId, song.albumId, song.id);
    }
  }
  log.info(`Media sync in ${((performance.now() - now) / 1000).toFixed(2)}s`);
};
