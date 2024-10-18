/**
 * Misc utilities.
 * @module
 */
import { crypto } from "@std/crypto";
import { encodeHex } from "@std/encoding";

export * from "@src/utils/format.ts";
export * from "@src/utils/sort.ts";

/** Does what is says */
export const encodeHash = (value: string): Promise<string> =>
  crypto.subtle.digest("FNV32A", new TextEncoder().encode(value)).then(
    encodeHex,
  );

/** Return a HTTP redirect response (default 302) */
export const redirect = (location: string | URL, status = 302) => {
  location = location instanceof URL ? location.href : location;
  return new Response(null, {
    status,
    headers: {
      location,
    },
  });
};

// deno-lint-ignore no-explicit-any
export const deepFreeze = (value: any) => {
  for (const key of Reflect.ownKeys(value)) {
    if (value[key] && typeof value[key] === "object") {
      deepFreeze(value[key]);
    }
  }
  return Object.freeze(value);
};
