export type DigitalProductAsset = {
  key: string;
  filename: string;
  label: string;
};

export type DigitalDownloadCode = "ebook" | "audiobook";

const DIGITAL_ASSETS: Record<string, DigitalProductAsset[]> = {
  "ghfp-ebook": [
    {
      key: "digital-products/group-home-funding-playbook-ebook_6ae9ae87.pdf",
      filename: "GroupHomeFundingPlaybook_eBook.pdf",
      label: "Download the eBook",
    },
  ],
  "ghfp-audio": [
    {
      key: "digital-products/group-home-funding-playbook-audiobook_af364622.mp3",
      filename: "GroupHomeFundingPlaybook_Audiobook.mp3",
      label: "Download the audiobook",
    },
  ],
};

DIGITAL_ASSETS["ghfp-bundle"] = [
  ...DIGITAL_ASSETS["ghfp-ebook"],
  ...DIGITAL_ASSETS["ghfp-audio"],
];

const DOWNLOAD_ASSET_KEYS: Record<DigitalDownloadCode, string> = {
  ebook: DIGITAL_ASSETS["ghfp-ebook"][0].key,
  audiobook: DIGITAL_ASSETS["ghfp-audio"][0].key,
};

const DOWNLOAD_CODES_BY_ASSET_KEY = new Map(
  Object.entries(DOWNLOAD_ASSET_KEYS).map(([code, key]) => [key, code as DigitalDownloadCode]),
);

export function digitalAssetsForProducts(productIds: string[]): DigitalProductAsset[] {
  const assets = productIds.flatMap(id => DIGITAL_ASSETS[id] || []);
  return Array.from(new Map(assets.map(asset => [asset.key, asset])).values());
}

export function digitalAssetForDownloadCode(
  productIds: string[],
  code: string,
): DigitalProductAsset | undefined {
  const assetKey = DOWNLOAD_ASSET_KEYS[code as DigitalDownloadCode];
  if (!assetKey) return undefined;
  return digitalAssetsForProducts(productIds).find(asset => asset.key === assetKey);
}

export function downloadCodeForAsset(assetKey: string): DigitalDownloadCode | undefined {
  return DOWNLOAD_CODES_BY_ASSET_KEY.get(assetKey);
}
