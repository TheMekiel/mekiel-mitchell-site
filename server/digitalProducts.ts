export type DigitalProductAsset = {
  key: string;
  filename: string;
  label: string;
};

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

export function digitalAssetsForProducts(productIds: string[]): DigitalProductAsset[] {
  const assets = productIds.flatMap(id => DIGITAL_ASSETS[id] || []);
  return Array.from(new Map(assets.map(asset => [asset.key, asset])).values());
}
