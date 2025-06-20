/**
 * Podcast sync module.
 * @module
 */
import type { Podcast } from "@src/types.ts";
import { Queue } from "@dbushell/carriageway";
import * as html from "@std/html";
import * as xml from "@dbushell/xml-streamify";
import * as kv from "@src/sqlite/mod.ts";

const queue = new Queue<URL, Podcast>({
  concurrency: 5,
});

const callback = async (url: URL): Promise<Podcast> => {
  // Update existing or add new Podcast data
  const data: Partial<Podcast> = (await kv.getPodcastByURL(url.href)) ?? {
    id: kv.uuid(),
    url: url.href,
    count: 0,
  };
  // Remove existing data to ensure updates
  data.title = undefined;
  data.modified = undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort("Sync timeout");
  }, 30_000);
  const parser = xml.parse(url.href, {
    signal: controller.signal,
  });
  // Fallback data if no item is found
  let image: string | undefined;
  let modified: Date | undefined;
  for await (const node of parser) {
    if (node.is("channel", "title")) {
      data.title = html.unescape(node.innerText.trim());
    }
    // Prefer as fallback
    if (node.is("channel", "pubDate")) {
      modified = new Date(html.unescape(node.innerText.trim()));
    }
    // Use as last resort fallback
    if (node.is("channel", "lastBuildDate")) {
      modified ??= new Date(html.unescape(node.innerText.trim()));
    }
    // Use immediately
    if (node.is("channel", "item", "pubDate")) {
      data.modified = new Date(html.unescape(node.innerText.trim()));
    }
    // Use as fallback
    if (node.is("channel", "image", "url")) {
      image ??= node.innerText.trim();
    }
    // Prefer itunes image
    if (
      node.is("channel", "itunes:image") &&
      Object.hasOwn(node.attributes, "href")
    ) {
      image = node.attributes.href;
    }
    if (data.title && data.modified) {
      controller.abort();
      break;
    }
  }
  clearTimeout(timeout);
  data.modified ??= modified;
  if (image) data.image = image;
  if (data.title === undefined) {
    throw new Error(`Feed missing title: "${url}"`);
  }
  if (data.modified === undefined) {
    throw new Error(`Feed missing date: "${url}"`);
  }
  return data as Podcast;
};

export const syncFeed = async (url: URL): Promise<Podcast> => {
  const podcast = await queue.add(url, callback);
  await kv.setPodcast(podcast);
  return podcast;
};

export const syncAllPodcasts = async (): Promise<void> => {
  const tasks: Array<Promise<Podcast>> = [];
  for (const podcast of await kv.getPodcasts()) {
    tasks.push(syncFeed(new URL(podcast.url)));
  }
  await Promise.allSettled(tasks);
};
