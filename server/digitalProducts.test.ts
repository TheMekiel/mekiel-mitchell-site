import { describe, expect, it } from "vitest";
import {
  digitalAssetForDownloadCode,
  digitalAssetsForProducts,
  downloadCodeForAsset,
} from "./digitalProducts";

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

  it("maps each paid digital product to its stable download code", () => {
    const ebook = digitalAssetForDownloadCode(["ghfp-bundle"], "ebook");
    const audiobook = digitalAssetForDownloadCode(["ghfp-bundle"], "audiobook");

    expect(ebook?.filename).toBe("GroupHomeFundingPlaybook_eBook.pdf");
    expect(audiobook?.filename).toBe("GroupHomeFundingPlaybook_Audiobook.mp3");
    expect(downloadCodeForAsset(ebook!.key)).toBe("ebook");
    expect(downloadCodeForAsset(audiobook!.key)).toBe("audiobook");
  });

  it("does not expose a download code for an unpurchased product", () => {
    expect(digitalAssetForDownloadCode(["ghfp-ebook"], "audiobook")).toBeUndefined();
  });
});
