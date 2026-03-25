export type AlbumVersion = "PHOTOBOOK" | "ID_PASS" | "INVENTORY" | "POCAALBUM";

export interface AlbumItem {
  name: string;
  size: string;
  quantity: string;
  isRandom?: boolean;
}

export interface AlbumSpec {
  version: AlbumVersion;
  label: string;
  priceRandom: number;
  priceSet: number | null; // null = 개별판매만
  color: string;
  colorBg: string;
  items: AlbumItem[];
  photocardBreakdown?: string[];
}

export const ALBUM_SPECS: AlbumSpec[] = [
  {
    version: "PHOTOBOOK",
    label: "PHOTOBOOK Ver.",
    priceRandom: 20000,
    priceSet: null,
    color: "var(--pb)",
    colorBg: "var(--pb-bg)",
    items: [
      { name: "OUTBOX", size: "205×270×34mm", quantity: "1ea" },
      { name: "PHOTOBOOK", size: "182×257mm / 88p", quantity: "1ea" },
      { name: "MINI CD-R/HOLDER", size: "80×80mm", quantity: "1 disc" },
      { name: "LYRICS STICKER BOOK", size: "100×140mm", quantity: "1ea" },
      { name: "FOLDED POSTER", size: "364×257mm", quantity: "1ea" },
      { name: "CARD STICKER", size: "85.6×53.9mm", quantity: "1ea" },
      { name: "BOOKMARK", size: "35×120mm", quantity: "1/5 랜덤", isRandom: true },
      { name: "POSTCARD", size: "180×120mm", quantity: "1/2 랜덤", isRandom: true },
      { name: "PHOTOCARD", size: "55×85mm", quantity: "2/10 랜덤", isRandom: true },
      { name: "STARSHARD", size: "55×85mm", quantity: "1/5 랜덤", isRandom: true },
      { name: "4 CUT PHOTO", size: "100×150mm", quantity: "1/5 랜덤", isRandom: true },
      { name: "ASTERUM PATCH", size: "38×38mm", quantity: "1/5 초판한정", isRandom: true },
    ],
  },
  {
    version: "ID_PASS",
    label: "ID PASS Ver.",
    priceRandom: 14900,
    priceSet: 74500,
    color: "var(--id)",
    colorBg: "var(--id-bg)",
    items: [
      { name: "OUTBOX", size: "150×150mm", quantity: "5 Ver." },
      { name: "CD-R", size: "150×120mm", quantity: "5 Ver. / 1 disc" },
      { name: "ID PASS CARD", size: "86×54mm", quantity: "5 Ver. / 1ea" },
      { name: "LYRICS PAPER", size: "140×140mm", quantity: "5 Ver. / 1ea" },
      { name: "STARSHARD", size: "55×40mm", quantity: "1/5 랜덤", isRandom: true },
      { name: "ID PHOTO", size: "30×40mm", quantity: "5 Ver. / 1ea" },
      { name: "PLBBUU SEAL STICKER", size: "38×50mm", quantity: "1/10 랜덤", isRandom: true },
      { name: "PHOTOCARD", size: "55×85mm", quantity: "1/2 랜덤", isRandom: true },
    ],
  },
  {
    version: "INVENTORY",
    label: "INVENTORY Ver.",
    priceRandom: 17100,
    priceSet: 85500,
    color: "var(--iv)",
    colorBg: "var(--iv-bg)",
    items: [
      { name: "INVENTORY", size: "170×85×25mm", quantity: "5 Ver. / 1ea" },
      { name: "MINI CD-R", size: "90×90mm", quantity: "5 Ver. / 1 disc" },
      { name: "LENTICULAR PHOTOCARD", size: "55×85mm", quantity: "5 Ver. / 1ea" },
      { name: "TINY PHOTOBOOK", size: "35×50mm / 16p", quantity: "1ea" },
      { name: "PIN BADGE", size: "25×25mm", quantity: "5 Ver. / 1ea" },
      { name: "MINI ITEM BOX", size: "30×40×15mm", quantity: "5 Ver. / 1ea" },
      { name: "ACRYLIC CHARM", size: "38×50mm", quantity: "1/2 랜덤", isRandom: true },
      { name: "PHOTOCARD", size: "55×85mm", quantity: "2/10 랜덤", isRandom: true },
      { name: "DECO STICKER", size: "Various", quantity: "5 Ver. / 3ea" },
    ],
  },
  {
    version: "POCAALBUM",
    label: "POCAALBUM Ver.",
    priceRandom: 8200,
    priceSet: 41000,
    color: "var(--pa)",
    colorBg: "var(--pa-bg)",
    items: [
      { name: "ENVELOPE", size: "75×105mm", quantity: "5 Ver." },
      { name: "QR CARD", size: "55×85mm", quantity: "1/10 랜덤", isRandom: true },
      { name: "USER GUIDE", size: "55×85mm", quantity: "1ea" },
      { name: "DIGITAL CONTENT", size: "QR", quantity: "—" },
      { name: "PHOTOCARD", size: "55×85mm", quantity: "3/58 랜덤", isRandom: true },
    ],
    photocardBreakdown: [
      "DRAWING 5", "UNIT 10", "GROUP 2", "CLEAR 10",
      "MINI INSTANT PHOTO 5", "SELF-DOODLE 10",
      "BACK SHOT 5", "NIMBUS 5", "CARD STICKER 5",
    ],
  },
];

export const COLLECTION_REQUIREMENTS = [
  { version: "PHOTOBOOK" as AlbumVersion, minAlbums: 5, cost: 100000, bottleneck: "PHOTOCARD 10종 (2장/앨범)" },
  { version: "ID_PASS" as AlbumVersion, minAlbums: 10, cost: 149000, bottleneck: "SEAL STICKER 10종 (1장/앨범)" },
  { version: "INVENTORY" as AlbumVersion, minAlbums: 5, cost: 85500, bottleneck: "PHOTOCARD 10종 (2장/앨범)" },
  { version: "POCAALBUM" as AlbumVersion, minAlbums: 20, cost: 164000, bottleneck: "PHOTOCARD 58종 (3장/앨범)" },
];
