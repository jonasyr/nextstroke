import { z } from "zod";

export const ID_PREFIXES = ["ast", "prj", "rev", "msk", "tr", "prv", "sug", "run", "cal"] as const;
export type IdPrefix = (typeof ID_PREFIXES)[number];

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** An entity id such as `ast_0123456789abcdef`; `random` returns [0, 1). */
export function newId(prefix: IdPrefix, random: () => number = Math.random): string {
  let body = "";
  for (let i = 0; i < 16; i++) body += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return `${prefix}_${body}`;
}

export const idOf = (prefix: IdPrefix) =>
  z.string().regex(new RegExp(`^${prefix}_[0-9a-z]{4,64}$`), `expected a ${prefix}_ id`);
