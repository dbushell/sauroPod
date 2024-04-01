/**
 * @module MurmurHash3
 * @see {@link https://github.com/justjavac/deno-murmurhash/}
 */
import MurmurHash3 from './murmurhash.ts';

/** Encode MurmurHash3 as a hexadecimal string */
export const encodeHash = (value: string) => new MurmurHash3(value).result().toString(16);
