/**
 * Shared server and client utilities.
 * @module
 */
export * from '@src/shared/data.ts';
export * from '@src/shared/format.ts';
export * from '@src/shared/sort.ts';

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

// deno-lint-ignore no-explicit-any
export const deepFreeze = (value: any) => {
  for (const key of Reflect.ownKeys(value)) {
    if (value[key] && typeof value[key] === 'object') {
      deepFreeze(value[key]);
    }
  }
  return Object.freeze(value);
};
