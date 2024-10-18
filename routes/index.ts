import type { HyperHandle } from "@dbushell/hyperserve";

export const GET: HyperHandle = () => {
  return new Response(null, {
    status: 302,
    headers: {
      location: "/podcasts/",
    },
  });
};
