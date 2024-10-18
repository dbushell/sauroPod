/**
 * Episode sync module.
 * @module
 */
import type { Episode, Podcast } from "@src/types.ts";
import { Queue } from "@dbushell/carriageway";
import { log } from "@src/log.ts";
import * as html from "@std/html";
import * as xml from "@dbushell/xml-streamify";
import * as kv from "@src/kv/mod.ts";
import { encodeHash } from "@src/utils/mod.ts";

const queue = new Queue<Podcast, void>({
  concurrency: 5,
});

const callback = async (podcast: Podcast): Promise<void> => {
  const newEpisodes: Array<Episode> = [];
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort("Sync timeout");
  }, 30_000);
  const parser = xml.parse(podcast.url, {
    signal: controller.signal,
  });
  for await (const node of parser) {
    if (!node.is("channel", "item")) {
      continue;
    }
    const enclosure = node.first("enclosure");
    if (enclosure === undefined) continue;
    let duration = 0;
    const durationText = node.first("itunes:duration")?.innerText;
    if (durationText) {
      for (const [i, n] of durationText.split(":").reverse().entries()) {
        duration += Number.parseInt(n) * Math.pow(60, i);
      }
    }
    // Remove query string from url
    const url = new URL(enclosure.attributes.url);
    url.search = "";
    const pubDate = html.unescape(
      node.first("pubDate")?.innerText.trim() ?? "",
    );
    const newEp: Episode = {
      duration,
      id: "",
      podcastId: podcast.id,
      url: url.href,
      title: html.unescape(node.first("title")?.innerText.trim() ?? ""),
      mimetype: enclosure.attributes.type ?? "",
      date: new Date(pubDate || Date.now()),
    };
    // Add GUID if specified to help matching later
    let guid = node.first("guid")?.innerText.trim() ?? "";
    guid = guid.replace(/^<!\[CDATA\[(.*)]]>$/, "$1");
    if (guid) {
      newEp.guid = await encodeHash(guid);
    }
    newEpisodes.push(newEp);
  }
  clearTimeout(timeout);
  if (!newEpisodes.length) {
    log.warn(`No episodes: "${podcast.url}"`);
    return;
  }

  // Assign UUIDs to all episodes
  newEpisodes.forEach((e) => (e.id = kv.uuid()));
  // Sort reverse chronological because some feeds are random
  newEpisodes.sort((a, b) => a.date.getTime() - b.date.getTime());

  const episodeIds = new Set<string>();
  const oldEpisodes = await kv.getEpisodes(podcast.id);
  for (const newEp of newEpisodes) {
    let oldEp: Episode | undefined;
    // Find existing episode by guid
    if (newEp.guid) {
      oldEp = oldEpisodes.find((e) => e.guid === newEp.guid);
    }
    // Find existing episode by title and url
    if (!oldEp) {
      oldEp = oldEpisodes.find((e) =>
        e.title === newEp.title && e.url === newEp.url
      );
    }
    // Add new episode if not found
    if (oldEp === undefined) {
      await kv.setEpisode(newEp);
      continue;
    }
    // Look for changed properties
    newEp.id = oldEp.id;
    episodeIds.add(newEp.id);
    const changed = Object.entries(newEp).find(
      ([key, value]) =>
        key in oldEp &&
        oldEp[key as keyof Episode]!.toString() !== value.toString(),
    );
    if (changed) {
      await kv.setEpisode(newEp);
    }
  }

  // Remove outdated or unknown episodes
  oldEpisodes
    .filter((e) => !episodeIds.has(e.id))
    .forEach((e) => {
      kv.deleteEpisode(e);
    });

  // Update modified date for Podcast
  if (newEpisodes.length) {
    podcast.count = newEpisodes.length;
    podcast.latestId = newEpisodes.at(-1)!.id;
    const modified = newEpisodes.at(-1)!.date;
    if (modified.getTime() > podcast.modified.getTime()) {
      podcast.modified = modified;
    }
    await kv.setPodcast(podcast);
  }

  setTimeout(() => {
    dispatchEvent(
      new CustomEvent<Podcast>("podcast:sync", { detail: podcast }),
    );
  }, 0);
};

export const syncEpisodes = (podcast: Podcast): Promise<void> => {
  return queue.add(podcast, callback);
};

export const syncAllEpisodes = async (): Promise<void> => {
  const tasks: Array<Promise<void>> = [];
  for (const podcast of await kv.getPodcasts()) {
    tasks.push(syncEpisodes(podcast));
  }
  await Promise.allSettled(tasks);
};
