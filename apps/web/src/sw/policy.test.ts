import { describe, expect, it } from "vitest";
import { cacheName, isPrecached, renderServiceWorker } from "./policy.ts";

const scope = "https://app.example/nextstroke/";

describe("service worker cache policy", () => {
  const precache = ["./", "index.html", "assets/index-abc.js", "manifest.webmanifest"];

  it("serves only the precached app shell from cache", () => {
    expect(isPrecached(`${scope}assets/index-abc.js`, scope, precache)).toBe(true);
    expect(isPrecached(`${scope}`, scope, precache)).toBe(true);
    expect(isPrecached(`${scope}index.html?v=2`, scope, precache)).toBe(true);
  });

  it("never caches user artwork or anything outside the shell", () => {
    expect(isPrecached("blob:https://app.example/123", scope, precache)).toBe(false);
    expect(isPrecached(`${scope}uploads/photo.jpg`, scope, precache)).toBe(false);
    expect(isPrecached("https://api.openai.com/v1/images/edits", scope, precache)).toBe(false);
  });

  it("versions the cache by build", () => {
    expect(cacheName("0.1.0+abc")).toBe("nextstroke-shell-0.1.0+abc");
  });

  it("renders a worker script with the build's precache list and version", () => {
    const source = renderServiceWorker("0.1.0+abc", precache);
    expect(source).toContain('"assets/index-abc.js"');
    expect(source).toContain("nextstroke-shell-0.1.0+abc");
    expect(source).toContain("SKIP_WAITING");
    // Module scripts and stylesheets carry an Origin header; Vary: Origin must not cause misses.
    expect(source).toContain("ignoreVary: true");
    expect(() => new Function(source)).not.toThrow();
  });
});
