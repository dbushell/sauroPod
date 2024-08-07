/**
 * Misc utilities.
 * @module
 */
import {crypto} from '@std/crypto';
import {encodeHex} from '@std/encoding';

export const encodeHash = (value: string): Promise<string> =>
  crypto.subtle.digest('FNV32A', new TextEncoder().encode(value)).then(encodeHex);
