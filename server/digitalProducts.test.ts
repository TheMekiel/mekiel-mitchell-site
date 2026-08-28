import { describe, expect, it } from "vitest";
import { digitalAssetsForProducts } from "./digitalProducts";

describe("digitalAssetsForProducts", () => {
  it("returns one eBook asset for the eBook product", () => {
    expect(digitalAssetsForProducts(["ghfp-ebook"])).toHaveLength(1);
  });

  it("returns both unique assets for the digital bundle", () => {
    const assets = digitalAssetsForProducts(["ghfp-bundle"]);
    expect(assets.map(asset => asset.filename)).toEqual([
      "GroupHomeFundingPlaybook_eBook.pdf",
      "GroupHomeFundingPlaybook_Audiobook.mp3",
    ]);
  });

  it("deduplicates bundle assets when individual products are also present", () => {
    expect(digitalAssetsForProducts(["ghfp-bundle", "ghfp-audio", "ghfp-ebook"])).toHaveLength(2);
  });
});
