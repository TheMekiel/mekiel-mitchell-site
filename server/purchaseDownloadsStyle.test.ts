import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");

describe("purchase thank-you download links", () => {
  it("uses visible gold text with an underline and preserves the gold border", () => {
    expect(html).toMatch(
      /\.purchase-downloads a \{[^}]*border: 1px solid var\(--gold-500\);[^}]*color: var\(--gold-500\);[^}]*text-decoration: underline;[^}]*text-underline-offset: 3px;/,
    );
    expect(html).toContain(
      ".purchase-downloads a:hover { background: var(--gold-500); color: var(--navy-900); }",
    );
  });
});
