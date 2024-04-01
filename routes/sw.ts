import type {DinoHandle} from 'dinossr';

export const pattern = '.js';

export const GET: DinoHandle = async ({response, platform}) => {
  if (!(response instanceof Response)) {
    return response;
  }
  // Deno file server may return 304 Not Modified
  if (!response.ok || !response.body) {
    return response;
  }
  let body = await response.text();
  body = body.replaceAll('%DEPLOY_HASH%', platform.deployHash);
  response = new Response(body, response);
  return response;
};
