/**
 * Shared server and client utilities.
 * @module
 */
export * from './format.ts';

/** Return a HTTP redirect response (default 302) */
export const redirect = (location: string | URL, status = 302) => {
  location = location instanceof URL ? location.href : location;
  return new Response(null, {
    status,
    headers: {
      location
    }
  });
};
