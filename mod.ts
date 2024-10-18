#!/usr/bin/env -S deno run --no-lock --unstable-kv --unstable-cron --allow-all mod.ts --dev
import { Hyperserve } from "@dbushell/hyperserve";
import * as cache from "@src/cache/mod.ts";
import { syncMedia } from "@src/sync/media.ts";
import { syncPodcasts } from "@src/sync/mod.ts";
import { log } from "@src/log.ts";
import "@src/events.ts";
import "@src/shutdown.ts";

if (import.meta.main) {
  const ssr = new Hyperserve(import.meta.dirname, {
    dev: Deno.args.includes("--dev"),
  });

  await ssr.init();

  ssr.router.onError = (error, request) => {
    log.error(request.url);
    log.error(error);
    return new Response(null, { status: 500 });
  };

  ssr.router.use(({ request, platform }) => {
    log.debug(`[${request.method}] ${request.url}`);
    platform.platformProps.app = "sauroPod";
    platform.platformProps.dev = ssr.dev;
    platform.platformProps.version = platform.deployHash;
    platform.platformProps.fragment = request.headers.has("x-fragment");
  });

  ssr.router.get("*", async ({ response }) => {
    if (!(response instanceof Response)) {
      return response;
    }
    const contentType = response.headers.get("content-type");
    if (
      contentType?.includes("text/html") ||
      contentType?.includes("text/javascript")
    ) {
      let body = await response.text();
      body = body.replaceAll("%DEPLOY_HASH%", ssr.deployHash);
      response = new Response(body, response);
    }
    return response;
  });

  if (Deno.args.includes("--cron")) {
    // Every 15 minutes
    Deno.cron("podcast sync", "*/15 * * * *", {}, async () => {
      await syncPodcasts();
    });
    // Every hour
    Deno.cron("media sync", "0 * * * *", {}, async () => {
      await syncMedia();
    });
    // Every day
    Deno.cron("cache clean", "0 0 * * *", {}, async () => {
      await cache.clean();
    });
  }

  if (Deno.args.includes("--sync")) {
    setTimeout(() => {
      syncPodcasts().finally(() => {
        syncMedia();
      });
    }, 5000);
  }
}
