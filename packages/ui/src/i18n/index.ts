import { de, type MessageKey } from "./de.ts";

export { de, type MessageKey };

export const LOCALES = ["de"] as const;

/** Look up a message and fill `{name}` placeholders; unknown placeholders stay visible. */
export function t(key: MessageKey, params: Readonly<Record<string, string>> = {}): string {
  return de[key].replace(/\{(\w+)\}/g, (match, name: string) => params[name] ?? match);
}
