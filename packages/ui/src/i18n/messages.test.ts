import { describe, expect, it } from "vitest";
import { de, LOCALES, t } from "./index.ts";

describe("message catalog (D-040)", () => {
  it("ships German only", () => {
    expect(LOCALES).toEqual(["de"]);
  });

  it("has no empty messages", () => {
    for (const [key, text] of Object.entries(de)) {
      expect(text.trim(), key).not.toBe("");
    }
  });

  it("looks up and fills placeholders", () => {
    expect(t("app.name")).toBe("NextStroke");
    expect(t("status.version", { version: "0.1.0" })).toBe("Version 0.1.0");
  });

  it("leaves unknown placeholders visible instead of dropping them", () => {
    expect(t("status.version")).toBe("Version {version}");
  });
});
