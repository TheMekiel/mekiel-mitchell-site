import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const faviconSource = new URL("../client/public/apple-touch-icon.png", import.meta.url);
const faviconCopy = new URL("../project-files/favicon.png", import.meta.url);
const openingPageSource = new URL("../client/index.html", import.meta.url);
const openingPageCopy = new URL("../project-files/opening-page.html", import.meta.url);

describe("saved site asset copies", () => {
  it("preserves byte-identical copies of the favicon and opening page", async () => {
    const [sourceFavicon, copiedFavicon, sourcePage, copiedPage] = await Promise.all([
      readFile(faviconSource),
      readFile(faviconCopy),
      readFile(openingPageSource, "utf8"),
      readFile(openingPageCopy, "utf8"),
    ]);

    expect(copiedFavicon.equals(sourceFavicon)).toBe(true);
    expect(copiedPage).toBe(sourcePage);
  });
});
