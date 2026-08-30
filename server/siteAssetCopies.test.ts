import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const faviconSource = new URL("../client/public/apple-touch-icon.png", import.meta.url);
const faviconCopy = new URL("../project-files/favicon.png", import.meta.url);
const kitFavicon = new URL("../project-files/kit-favicon.png", import.meta.url);
const kitFaviconSvg = new URL("../project-files/kit-favicon.svg", import.meta.url);
const kitEmailLogo = new URL("../project-files/kit-email-logo-transparent.png", import.meta.url);
const kitLandingHero = new URL("../project-files/kit-landing-hero.jpg", import.meta.url);
const openingPageSource = new URL("../client/index.html", import.meta.url);
const openingPageCopy = new URL("../project-files/opening-page.html", import.meta.url);

function readJpegDimensions(buffer: Buffer) {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) throw new Error("Invalid JPEG marker");
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker && marker >= 0xc0 && marker <= 0xc3) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error("JPEG dimensions not found");
}

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

  it("keeps the Kit upload favicon as a 180px square PNG", async () => {
    const kitPng = await readFile(kitFavicon);

    expect(kitPng.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(kitPng.readUInt32BE(16)).toBe(180);
    expect(kitPng.readUInt32BE(20)).toBe(180);
  });

  it("includes an SVG favicon backup with the MM monogram", async () => {
    const svg = await readFile(kitFaviconSvg, "utf8");

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 180 180"');
    expect(svg).toContain('aria-label="MM monogram favicon"');
    expect((svg.match(/<path/g) ?? [])).toHaveLength(2);
    expect(svg).not.toContain("<text");
  });

  it("includes a transparent email logo and optimized 1920px Kit landing-page hero", async () => {
    const [logoPng, heroJpeg] = await Promise.all([readFile(kitEmailLogo), readFile(kitLandingHero)]);

    expect(logoPng.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(logoPng[25]).toBe(6);
    expect(readJpegDimensions(heroJpeg)).toEqual({ width: 1920, height: 1080 });
    expect(heroJpeg.byteLength).toBeLessThan(25 * 1024 * 1024);
  });
});
