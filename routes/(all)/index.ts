import type { HyperHandle } from "@dbushell/hyperserve";
import { Node, parseHTML } from "@dbushell/hyperless";
import { encodeHash } from "@src/utils/mod.ts";

export const pattern = "*";
export const order = 999;

/** Map URL to body hash and last modified date */
const modifiedMap = new Map<string, { hash: string; date: string }>();

export const GET: HyperHandle = async ({ request, response }) => {
  if (!response) return;
  if (response.ok && request.headers.has("x-fragment")) {
    const last = modifiedMap.get(request.url);
    const body = await response.text();
    const hash = await encodeHash(body);
    const date = !last || hash !== last.hash
      ? new Date().toUTCString()
      : last.date;
    modifiedMap.set(request.url, { hash, date });
    response.headers.set("last-modified", date);
    response.headers.set("etag", `W/"${hash}"`);
    response.headers.set("cache-control", "public, max-age=0, must-revalidate");
    if (request.headers.get("if-modified-since") === date) {
      response = new Response(null, { status: 304 });
    } else {
      const root = parseHTML(body);
      const main = root.find((n) => n.tag === "sauropod-main");
      if (main) {
        const node = new Node(null, "INVISIBLE");
        const title = root.find((n) => n.tag === "title");
        if (title) node.append(title);
        node.append(...main.children);
        response = new Response(node.toString(), response);
      } else {
        response = new Response(body, response);
      }
    }
  }
  response.headers.set("vary", "x-fragment");
  // Add some flair
  response.headers.set("x-powered-by", "sauropod");
  // Allow Blob URLs for media
  response.headers.append("x-media-src", `blob:`);
  response.headers.append("x-img-src", `blob:`);
  return response;
};
