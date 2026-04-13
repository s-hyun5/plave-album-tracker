import { AlbumVersion } from "./albums";

export type RetailerType = "official" | "retailer" | "group_purchase";
export type Country = "KR" | "JP" | "US" | "TW" | "CN";
export type Currency = "KRW" | "JPY" | "USD" | "TWD" | "CNY";

export interface Benefit {
  type: "photocard" | "poster" | "sticker" | "event" | "other";
  name: string;
  description: string;
  isExclusive: boolean;
  versions?: AlbumVersion[];
  image?: string; // public/benefits/ 경로
}

export interface Product {
  version: AlbumVersion;
  saleType: "random" | "set" | "single";
  price: number;
  currency: Currency;
  url?: string;
}

export interface SalePeriod {
  type: "online" | "offline";
  store?: string;
  start: string;
  end: string;
  versions?: AlbumVersion[];
}

export interface Retailer {
  id: string;
  name: string;
  country: Country;
  currency: Currency;
  type: RetailerType;
  url?: string;
  shippingFee: number | null;
  shippingFreeOver?: number;
  shippingNote?: string;
  products: Product[];
  benefits: Benefit[];
  salePeriods?: SalePeriod[];
  notes?: string[];
  organizer?: string;
  originalRetailer?: string;
  deadline?: string;
  chartReflection?: string[];
}

export function getShippingFee(retailer: Retailer, cartTotal: number): number | null {
  if (retailer.shippingFee === null) return null;
  if (retailer.shippingFreeOver && cartTotal >= retailer.shippingFreeOver) return 0;
  return retailer.shippingFee;
}

export const RETAILERS: Retailer[] = [
  // ═══ 공식 판매처 ═══
  {
    id: "vlast",
    name: "VLAST Shop",
    country: "KR",
    currency: "KRW",
    type: "official",
    url: "https://vlastshop.com",
    shippingFee: 3000,
    shippingFreeOver: 50000,
    shippingNote: "5만원 이상 무료",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 20000, currency: "KRW", url: "https://vlastshop.com/product/video-call-event-plave-4th-mini-album-caligo-pt2-photobook-ver/295/category/1/display/3/" },
      { version: "ID_PASS", saleType: "random", price: 14900, currency: "KRW", url: "https://vlastshop.com/product/plave-4th-mini-album-caligo-pt2-id-pass-ver5%EC%A2%85-%EC%84%B8%ED%8A%B8/300/category/1/display/3/" },
      { version: "ID_PASS", saleType: "set", price: 74500, currency: "KRW", url: "https://vlastshop.com/product/plave-4th-mini-album-caligo-pt2-id-pass-ver5%EC%A2%85-%EC%84%B8%ED%8A%B8/300/category/1/display/3/" },
      { version: "INVENTORY", saleType: "random", price: 17100, currency: "KRW", url: "https://vlastshop.com/product/plave-4th-mini-album-caligo-pt2-inventory-ver5%EC%A2%85-%EC%84%B8%ED%8A%B8/302/category/1/display/3/" },
      { version: "INVENTORY", saleType: "set", price: 85500, currency: "KRW", url: "https://vlastshop.com/product/plave-4th-mini-album-caligo-pt2-inventory-ver5%EC%A2%85-%EC%84%B8%ED%8A%B8/302/category/1/display/3/" },
      { version: "POCAALBUM", saleType: "random", price: 8200, currency: "KRW", url: "https://vlastshop.com/product/plave-4th-mini-album-caligo-pt2-pocaalbum-ver5%EC%A2%85-%EC%84%B8%ED%8A%B8/296/category/1/display/3/" },
      { version: "POCAALBUM", saleType: "set", price: 41000, currency: "KRW", url: "https://vlastshop.com/product/plave-4th-mini-album-caligo-pt2-pocaalbum-ver5%EC%A2%85-%EC%84%B8%ED%8A%B8/296/category/1/display/3/" },
    ],
    benefits: [
      { type: "photocard", name: "VLAST 미공포", description: "포토카드 5종 중 1종 랜덤 증정 (앨범 1장당 1장)", isExclusive: true, versions: ["PHOTOBOOK"], image: "/benefits/vlast.png" },
      { type: "event", name: "영상통화 이벤트 1차", description: "3/24~3/27 23:59, 총 50명·멤버당 10명, 사인회 4/19 (영통 이벤트 구매페이지에서 구매 시에만 응모 적용, 일반판매 불가)", isExclusive: false, versions: ["PHOTOBOOK"] },
    ],
    salePeriods: [
      { type: "online", store: "영상통화 이벤트 1차", start: "2026-03-24 11:00", end: "2026-03-27 23:59", versions: ["PHOTOBOOK"] },
    ],
  },
  {
    id: "plave_youtube",
    name: "PLAVE 유튜브 스토어",
    country: "KR",
    currency: "KRW",
    type: "official",
    url: "https://www.youtube.com/@plave_official/store",
    shippingFee: 3000,
    shippingFreeOver: 50000,
    shippingNote: "5만원 이상 무료 (vlastshop 발송)",
    deadline: "2026-04-20 23:00",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 20000, currency: "KRW", url: "https://www.youtube.com/@plave_official/store" },
      { version: "ID_PASS", saleType: "random", price: 14900, currency: "KRW", url: "https://www.youtube.com/@plave_official/store" },
      { version: "INVENTORY", saleType: "random", price: 17100, currency: "KRW", url: "https://www.youtube.com/@plave_official/store" },
      { version: "POCAALBUM", saleType: "random", price: 8200, currency: "KRW", url: "https://www.youtube.com/@plave_official/store" },
    ],
    benefits: [
      { type: "photocard", name: "유튜브 쇼핑 미공포", description: "앨범 1장당 미공개 포토카드 5종 중 1종 랜덤 (전 버전 대상, 2장 이상 구매 시 중복없이)", isExclusive: true, image: "/benefits/youtube.png" },
    ],
    salePeriods: [
      { type: "online", start: "2026-04-13 18:00", end: "2026-04-20 23:00" },
    ],
    notes: ["유튜브 스토어 탭을 통해 [YOUTUBE EVENT] 상품으로 구매해야 특전 적용", "VLAST Shop 발송 (vlastshop.com 제공)", "주문 후 단순 변심 환불 불가"],
  },
  {
    id: "weverse",
    name: "Weverse Shop",
    country: "KR",
    currency: "KRW",
    type: "official",
    url: "https://shop.weverse.io",
    shippingFee: 3000,
    shippingFreeOver: 50000,
    shippingNote: "5만원 이상 무료",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 20000, currency: "KRW", url: "https://shop.weverse.io/ko/shop/KRW/artists/167/sales/55955" },
      { version: "ID_PASS", saleType: "random", price: 14900, currency: "KRW", url: "https://shop.weverse.io/ko/shop/KRW/artists/167/sales/55968" },
      { version: "ID_PASS", saleType: "set", price: 74500, currency: "KRW", url: "https://shop.weverse.io/ko/shop/KRW/artists/167/sales/55968" },
      { version: "INVENTORY", saleType: "random", price: 17100, currency: "KRW", url: "https://shop.weverse.io/ko/shop/KRW/artists/167/sales/55966" },
      { version: "INVENTORY", saleType: "set", price: 85500, currency: "KRW", url: "https://shop.weverse.io/ko/shop/KRW/artists/167/sales/55966" },
      { version: "POCAALBUM", saleType: "random", price: 8200, currency: "KRW", url: "https://shop.weverse.io/ko/shop/KRW/artists/167/sales/55970" },
      { version: "POCAALBUM", saleType: "set", price: 41000, currency: "KRW", url: "https://shop.weverse.io/ko/shop/KRW/artists/167/sales/55970" },
    ],
    benefits: [
      { type: "photocard", name: "위버스 예약특전", description: "앨범 1장당 미공개 포토카드 5종 중 1종 랜덤 제공", isExclusive: true, versions: ["POCAALBUM"], image: "/benefits/weverse.png" },
    ],
    salePeriods: [
      { type: "online", start: "2026-03-24 11:00", end: "2026-04-13 23:59" },
    ],
  },
  {
    id: "makestar",
    name: "Makestar",
    country: "KR",
    currency: "KRW",
    type: "retailer",
    url: "https://www.makestar.com",
    shippingFee: null,
    shippingNote: "확인 필요",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 20000, currency: "KRW", url: "https://www.makestar.com/product/16509" },
      { version: "POCAALBUM", saleType: "random", price: 8200, currency: "KRW", url: "https://www.makestar.com/product/16439" },
      { version: "POCAALBUM", saleType: "set", price: 41000, currency: "KRW", url: "https://www.makestar.com/product/16439" },
      { version: "ID_PASS", saleType: "random", price: 14900, currency: "KRW", url: "https://www.makestar.com/product/16506" },
      { version: "ID_PASS", saleType: "set", price: 74500, currency: "KRW", url: "https://www.makestar.com/product/16506" },
      { version: "INVENTORY", saleType: "random", price: 17100, currency: "KRW", url: "https://www.makestar.com/product/16507" },
      { version: "INVENTORY", saleType: "set", price: 85500, currency: "KRW", url: "https://www.makestar.com/product/16507" },
    ],
    benefits: [
      { type: "photocard", name: "메이크스타 미공포", description: "앨범 1매당 미공개 포토카드 5종 중 랜덤 1매 (2매 이상 구매 시 중복없이, 온/오프라인 동일)", isExclusive: true, versions: ["POCAALBUM"], image: "/benefits/makestar.png" },
    ],
    salePeriods: [
      { type: "online", start: "2026-03-24 11:00", end: "2026-04-20 19:59" },
      { type: "offline", store: "MAKESTAR SPACE 강남 (서울시 학동로23길 29 B1, 매일 12:00~20:00)", start: "2026-04-14", end: "2026-04-20" },
      { type: "offline", store: "MAKESTAR SPACE 상하이 (매일 11:00~21:00 CST)", start: "2026-04-14", end: "2026-04-20" },
      { type: "offline", store: "MAKESTAR SPACE 광저우 (매일 11:00~21:00 CST)", start: "2026-04-14", end: "2026-04-20" },
      { type: "offline", store: "MAKESTAR SPACE 심천 (매일 11:00~21:00 CST)", start: "2026-04-14", end: "2026-04-20" },
    ],
  },
  {
    id: "musinsa1",
    name: "무신사 1차",
    country: "KR",
    currency: "KRW",
    type: "retailer",
    url: "https://www.musinsa.com",
    shippingFee: 0,
    shippingNote: "회원 무료배송",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 20000, currency: "KRW", url: "https://www.musinsa.com/products/6176475" },
      { version: "ID_PASS", saleType: "random", price: 14900, currency: "KRW", url: "https://www.musinsa.com/products/6176349" },
      { version: "ID_PASS", saleType: "set", price: 74500, currency: "KRW", url: "https://www.musinsa.com/products/6176349" },
      { version: "INVENTORY", saleType: "random", price: 17100, currency: "KRW", url: "https://www.musinsa.com/products/6176242" },
      { version: "INVENTORY", saleType: "set", price: 85500, currency: "KRW", url: "https://www.musinsa.com/products/6176242" },
      { version: "POCAALBUM", saleType: "random", price: 8200, currency: "KRW", url: "https://www.musinsa.com/products/6176536" },
      { version: "POCAALBUM", saleType: "set", price: 41000, currency: "KRW", url: "https://www.musinsa.com/products/6176536" },
    ],
    benefits: [
      { type: "photocard", name: "무신사 1차 미공포", description: "미공개 포토카드 5종 중 1종 랜덤 (1:1, 2장 이상 구매 시 중복없이, 온/오프라인 동일)", isExclusive: true, versions: ["ID_PASS"], image: "/benefits/musinsa-S.png" },
    ],
    salePeriods: [
      { type: "online", start: "2026-03-24 11:00", end: "2026-04-13 23:59" },
      { type: "offline", store: "무신사 스토어 성수 (서울 성동구 연무장길 83 1F)", start: "2026-04-14 11:00", end: "2026-04-20 22:00" },
    ],
  },
  {
    id: "musinsa2",
    name: "무신사 2차",
    country: "KR",
    currency: "KRW",
    type: "retailer",
    url: "https://www.musinsa.com",
    shippingFee: 0,
    shippingNote: "회원 무료배송",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 20000, currency: "KRW" },
      { version: "ID_PASS", saleType: "random", price: 14900, currency: "KRW" },
      { version: "ID_PASS", saleType: "set", price: 74500, currency: "KRW" },
      { version: "INVENTORY", saleType: "random", price: 17100, currency: "KRW" },
      { version: "INVENTORY", saleType: "set", price: 85500, currency: "KRW" },
      { version: "POCAALBUM", saleType: "random", price: 8200, currency: "KRW" },
      { version: "POCAALBUM", saleType: "set", price: 41000, currency: "KRW" },
    ],
    benefits: [
      { type: "photocard", name: "무신사 2차 미공포", description: "미공개 포토카드 5종 중 1종 랜덤 (1:1, 2장 이상 구매 시 중복없이, 온/오프라인 동일)", isExclusive: true, versions: ["ID_PASS"], image: "/benefits/musinsa-M.png" },
      { type: "photocard", name: "ASTERUM 433-10 A2T DRAW 포토카드", description: "ASTERUM 433-10에서 제공되는 A2T DRAW와 동일한 포토카드 5종 중 랜덤 1종 (온라인 2차 + 명동 오프라인 동일, 십카페 럭드로도 동일 미공포 수령 가능)", isExclusive: false },
    ],
    salePeriods: [
      { type: "online", start: "2026-04-14 11:00", end: "2026-04-20 23:00" },
      { type: "offline", store: "무신사 스토어 명동 (서울 중구 명동길 13)", start: "2026-04-14 11:00", end: "2026-04-20 23:00" },
    ],
  },
  {
    id: "oliveyoung",
    name: "올리브영",
    country: "KR",
    currency: "KRW",
    type: "retailer",
    url: "https://www.oliveyoung.co.kr",
    shippingFee: 3500,
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 20000, currency: "KRW", url: "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=B000000251979" },
      { version: "ID_PASS", saleType: "random", price: 14900, currency: "KRW", url: "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=B000000251985" },
      { version: "ID_PASS", saleType: "set", price: 74500, currency: "KRW", url: "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=B000000251985" },
      { version: "INVENTORY", saleType: "random", price: 17100, currency: "KRW", url: "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=B000000251983" },
      { version: "INVENTORY", saleType: "set", price: 85500, currency: "KRW", url: "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=B000000251983" },
      { version: "POCAALBUM", saleType: "random", price: 8200, currency: "KRW", url: "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=B000000251981" },
      { version: "POCAALBUM", saleType: "set", price: 41000, currency: "KRW", url: "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=B000000251981" },
    ],
    benefits: [
      { type: "photocard", name: "단독 미공포", description: "미공개 포토카드 5종 중 랜덤 1종 (1:1, 온/오프라인 동일)", isExclusive: true, versions: ["ID_PASS"], image: "/benefits/olive-Y.png" },
    ],
    salePeriods: [
      { type: "online", start: "2026-03-24 11:00", end: "2026-04-20 22:00" },
      { type: "offline", store: "올리브영N 성수 (서울 성동구 연무장7길 13)", start: "2026-04-14 10:00", end: "2026-04-20 22:00" },
      { type: "offline", store: "올리브영 홍대놀이터점 (서울 마포구 와우산로21길 29)", start: "2026-04-14 10:00", end: "2026-04-20 22:00" },
    ],
  },
  {
    id: "musicart",
    name: "뮤직아트 (영풍문고)",
    country: "KR",
    currency: "KRW",
    type: "retailer",
    url: "https://www.musicart.kr",
    shippingFee: 3000,
    shippingFreeOver: 50000,
    shippingNote: "5만원 이상 무료",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 20000, currency: "KRW", url: "http://musicart.kr/shop/shopdetail.html?branduid=3530780" },
      { version: "ID_PASS", saleType: "random", price: 14900, currency: "KRW", url: "http://musicart.kr/shop/shopdetail.html?branduid=3530781" },
      { version: "ID_PASS", saleType: "set", price: 74500, currency: "KRW", url: "http://musicart.kr/shop/shopdetail.html?branduid=3530782" },
      { version: "INVENTORY", saleType: "random", price: 17100, currency: "KRW", url: "http://musicart.kr/shop/shopdetail.html?branduid=3530783" },
      { version: "INVENTORY", saleType: "set", price: 85500, currency: "KRW", url: "http://musicart.kr/shop/shopdetail.html?branduid=3530784" },
      { version: "POCAALBUM", saleType: "random", price: 8200, currency: "KRW", url: "http://musicart.kr/shop/shopdetail.html?branduid=3530778" },
      { version: "POCAALBUM", saleType: "set", price: 41000, currency: "KRW", url: "http://musicart.kr/shop/shopdetail.html?branduid=3530779" },
    ],
    benefits: [
      { type: "photocard", name: "영풍문고 미공포", description: "미공개 포토카드 5종 중 1종 랜덤 (1:1, 2장 이상 구매 시 중복없이, 온/오프라인 3곳 동일)", isExclusive: true, versions: ["POCAALBUM"], image: "/benefits/yp.png" },
    ],
    salePeriods: [
      { type: "online", start: "2026-03-24 11:00", end: "2026-04-20 22:00" },
      { type: "offline", store: "THE STAGE (서울 종로구 청계천로 41 영풍빌딩 B2, 영풍문고 종각종로본점 내, 매일 10:00~22:00)", start: "2026-04-14 10:00", end: "2026-04-20 22:00" },
      { type: "offline", store: "영풍문고 여의도IFC몰점 (서울 영등포구 국제금융로 10 IFC몰 L2층 내 음반매장, 매일 10:00~22:00)", start: "2026-04-14 10:00", end: "2026-04-20 22:00" },
      { type: "offline", store: "영풍문고 홍대점 (서울 마포구 양화로 161 케이스퀘어 지하 2층, 매일 11:00~22:00)", start: "2026-04-14 11:00", end: "2026-04-20 22:00" },
    ],
  },
  {
    id: "hello82",
    name: "hello82",
    country: "US",
    currency: "USD",
    type: "retailer",
    shippingFee: null,
    shippingNote: "별도",
    products: [
      { version: "ID_PASS", saleType: "random", price: 29.98, currency: "USD", url: "https://x.com/hello82official/status/2036262062024999073?s=20" },
      { version: "ID_PASS", saleType: "set", price: 149.90, currency: "USD", url: "https://x.com/hello82official/status/2036262062024999073?s=20" },
    ],
    benefits: [
      { type: "photocard", name: "Exclusive 포카 (BITE Ver.)", description: "hello82 Exclusive 포토카드 55×85mm, 5종 중 1종 랜덤", isExclusive: true, versions: ["ID_PASS"], image: "/benefits/hello82-bite.jpeg" },
      { type: "photocard", name: "POP-UP 포카 (LOOKUP Ver.)", description: "POP-UP Exclusive 포토카드 55×85mm, 5종 중 1종 랜덤", isExclusive: true, versions: ["ID_PASS"], image: "/benefits/hello82-lookup.jpeg" },
    ],
    salePeriods: [
      { type: "online", start: "2026-03-24 11:00", end: "2026-04-20 11:59" },
    ],
    notes: ["미국 주소만 가능 (포워딩 불가)", "버전당 최대 4장", "Market을 US로 미리 설정 후 링크 클릭 필요"],
    chartReflection: ["Billboard", "Circle", "한터"],
  },
  {
    id: "willmusic",
    name: "WillMusic",
    country: "TW",
    currency: "TWD",
    type: "retailer",
    url: "https://www.willmusic.com.tw",
    shippingFee: 60,
    shippingFreeOver: 1599,
    shippingNote: "NT$1,599 이상 무료 (편의점 픽업)",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 520, currency: "TWD", url: "https://www.willmusic.com.tw/SalePage/Index/11651405" },
      { version: "ID_PASS", saleType: "random", price: 380, currency: "TWD", url: "https://www.willmusic.com.tw/SalePage/Index/11651547" },
      { version: "ID_PASS", saleType: "set", price: 1900, currency: "TWD", url: "https://www.willmusic.com.tw/SalePage/Index/11651547" },
      { version: "INVENTORY", saleType: "random", price: 430, currency: "TWD", url: "https://www.willmusic.com.tw/SalePage/Index/11651533" },
      { version: "INVENTORY", saleType: "set", price: 2150, currency: "TWD", url: "https://www.willmusic.com.tw/SalePage/Index/11651533" },
      { version: "POCAALBUM", saleType: "random", price: 210, currency: "TWD", url: "https://www.willmusic.com.tw/SalePage/Index/11651580" },
      { version: "POCAALBUM", saleType: "set", price: 1050, currency: "TWD", url: "https://www.willmusic.com.tw/SalePage/Index/11651580" },
    ],
    benefits: [
      { type: "photocard", name: "WillMusic 미공포", description: "POCAALBUM 구매 시 미공개 포토카드 5종 중 1종 랜덤", isExclusive: true, versions: ["POCAALBUM"], image: "/benefits/will.png" },
    ],
    salePeriods: [
      { type: "online", start: "2026-03-24 10:00", end: "2026-04-20 23:59" },
    ],
    notes: ["hello82 독점 ID PASS (BITE/LOOKUP Ver.) NT$1,920 별도 판매"],
  },
  {
    id: "qqmusic",
    name: "QQ Music (TME)",
    country: "CN",
    currency: "CNY",
    type: "retailer",
    shippingFee: null,
    shippingNote: "순풍택배 첫 건 13元 + 추가 8元",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 96, currency: "CNY" },
      { version: "INVENTORY", saleType: "random", price: 82, currency: "CNY", url: "https://i2.y.qq.com/n3/cm/pages/putao/product_detail/index.html?productID=1205352611489586" },
      { version: "POCAALBUM", saleType: "random", price: 39, currency: "CNY", url: "https://i2.y.qq.com/n3/cm/pages/putao/product_detail/index.html?productID=1205352975280253" },
    ],
    benefits: [
      { type: "photocard", name: "TME 미공포", description: "PHOTOBOOK 구매 시 미공개 포토카드 5종 중 1종 랜덤", isExclusive: true, versions: ["PHOTOBOOK"], image: "/benefits/tme.png" },
    ],
    salePeriods: [
      { type: "online", start: "2026-03-24 10:00", end: "2026-04-13 22:59" },
    ],
    notes: ["중국 대륙만 배송", "5종 랜덤 1종, 5장 구매 시 풀세트"],
  },

  // ═══ 공구 ═══
  {
    id: "gp_dearmymuse",
    name: "디어마이뮤즈",
    country: "KR",
    currency: "KRW",
    type: "group_purchase",
    organizer: "음원총공팀",
    url: "https://dearmymuse.com",
    deadline: "2026-04-14 17:00",
    shippingFee: 3000,
    shippingFreeOver: 30000,
    shippingNote: "3만원 이상 무료",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 16500, currency: "KRW", url: "https://dearmymuse.com/product/0414-%EC%98%88%EC%95%BD%ED%8C%90%EB%A7%A4%EA%B3%B5%EB%8F%99%EA%B5%AC%EB%A7%A4-plave%ED%94%8C%EB%A0%88%EC%9D%B4%EB%B8%8C-4th-mini-album-caligo-pt2-photobook-ver/5806/category/364/display/1/" },
      { version: "INVENTORY", saleType: "random", price: 14200, currency: "KRW", url: "https://dearmymuse.com/product/0414-%EC%98%88%EC%95%BD%ED%8C%90%EB%A7%A4%EA%B3%B5%EB%8F%99%EA%B5%AC%EB%A7%A4-plave%ED%94%8C%EB%A0%88%EC%9D%B4%EB%B8%8C-4th-mini-album-caligo-pt2-inventory-ver-%EB%B2%84%EC%A0%84-%EB%9E%9C%EB%8D%A4-/5807/category/364/display/1/" },
      { version: "INVENTORY", saleType: "set", price: 70000, currency: "KRW", url: "https://dearmymuse.com/product/0414-%EC%98%88%EC%95%BD%ED%8C%90%EB%A7%A4%EA%B3%B5%EB%8F%99%EA%B5%AC%EB%A7%A4-plave%ED%94%8C%EB%A0%88%EC%9D%B4%EB%B8%8C-4th-mini-album-caligo-pt2-inventory-ver-5%EC%A2%85-%EC%84%B8%ED%8A%B8/5808/category/364/display/1/" },
      { version: "ID_PASS", saleType: "random", price: 12400, currency: "KRW", url: "https://dearmymuse.com/product/0414-%EC%98%88%EC%95%BD%ED%8C%90%EB%A7%A4%EA%B3%B5%EB%8F%99%EA%B5%AC%EB%A7%A4-plave%ED%94%8C%EB%A0%88%EC%9D%B4%EB%B8%8C-4th-mini-album-caligo-pt2-id-pass-ver-%EB%B2%84%EC%A0%84-%EB%9E%9C%EB%8D%A4-%EC%B6%9C%EA%B3%A0/5809/category/364/display/1/" },
      { version: "ID_PASS", saleType: "set", price: 61200, currency: "KRW", url: "https://dearmymuse.com/product/0414-%EC%98%88%EC%95%BD%ED%8C%90%EB%A7%A4%EA%B3%B5%EB%8F%99%EA%B5%AC%EB%A7%A4-plave%ED%94%8C%EB%A0%88%EC%9D%B4%EB%B8%8C-4th-mini-album-caligo-pt2-id-pass-ver-5%EC%A2%85-%EC%84%B8%ED%8A%B8/5810/category/364/display/1/" },
      { version: "POCAALBUM", saleType: "random", price: 6900, currency: "KRW", url: "https://dearmymuse.com/product/0414-%EC%98%88%EC%95%BD%ED%8C%90%EB%A7%A4%EA%B3%B5%EB%8F%99%EA%B5%AC%EB%A7%A4-plave%ED%94%8C%EB%A0%88%EC%9D%B4%EB%B8%8C-4th-mini-album-caligo-pt2-pocaalbum-ver-%EB%B2%84%EC%A0%84-%EB%9E%9C%EB%8D%A4-/5811/category/364/display/1/" },
      { version: "POCAALBUM", saleType: "set", price: 34500, currency: "KRW", url: "https://dearmymuse.com/product/0414-%EC%98%88%EC%95%BD%ED%8C%90%EB%A7%A4%EA%B3%B5%EB%8F%99%EA%B5%AC%EB%A7%A4-plave%ED%94%8C%EB%A0%88%EC%9D%B4%EB%B8%8C-4th-mini-album-caligo-pt2-pocaalbum-ver-5%EC%A2%85-%EC%84%B8%ED%8A%B8/5812/category/364/display/1/" },
    ],
    benefits: [
      { type: "other", name: "전광판 광고", description: "본사 전광판 광고", isExclusive: false },
    ],
    chartReflection: ["한터", "써클"],
    notes: ["현재 최저가", "무특전"],
  },
  {
    id: "gp_beatroad",
    name: "비트로드",
    country: "KR",
    currency: "KRW",
    type: "group_purchase",
    organizer: "음원총공팀",
    url: "https://beatroad.co.kr",
    deadline: "2026-04-12 23:59",
    shippingFee: 3000,
    shippingFreeOver: 30000,
    shippingNote: "3만원 이상 무료",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 16500, currency: "KRW", url: "https://beatroad.co.kr/surl/P/10706" },
      { version: "INVENTORY", saleType: "random", price: 14200, currency: "KRW", url: "https://beatroad.co.kr/surl/P/10712" },
      { version: "INVENTORY", saleType: "set", price: 70000, currency: "KRW", url: "https://beatroad.co.kr/surl/P/10711" },
      { version: "ID_PASS", saleType: "random", price: 12400, currency: "KRW", url: "https://beatroad.co.kr/surl/P/10710" },
      { version: "ID_PASS", saleType: "set", price: 61200, currency: "KRW", url: "https://beatroad.co.kr/surl/P/10709" },
      { version: "POCAALBUM", saleType: "random", price: 6900, currency: "KRW", url: "https://beatroad.co.kr/surl/P/10708" },
      { version: "POCAALBUM", saleType: "set", price: 34500, currency: "KRW", url: "https://beatroad.co.kr/surl/P/10707" },
    ],
    benefits: [
      { type: "other", name: "판매 확인서 발급", description: "판매 확인서 발급 가능", isExclusive: false },
    ],
    chartReflection: ["한터", "써클"],
    notes: ["현재 최저가", "출고: 발매 당일(4/14) 순차배송"],
  },
  {
    id: "gp_ktown4u",
    name: "Ktown4u",
    country: "KR",
    currency: "KRW",
    type: "group_purchase",
    organizer: "음원총공팀",
    deadline: "2026-04-14",
    shippingFee: 3000,
    shippingFreeOver: 30000,
    shippingNote: "3만원 이상 무료",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 16700, currency: "KRW", url: "https://kr.ktown4u.com/eventinfo?eve_no=44113596&biz_no=967" },
      { version: "INVENTORY", saleType: "random", price: 14300, currency: "KRW", url: "https://kr.ktown4u.com/eventinfo?eve_no=44113596&biz_no=967" },
      { version: "INVENTORY", saleType: "set", price: 70600, currency: "KRW", url: "https://kr.ktown4u.com/eventinfo?eve_no=44113596&biz_no=967" },
      { version: "ID_PASS", saleType: "random", price: 12500, currency: "KRW", url: "https://kr.ktown4u.com/eventinfo?eve_no=44113596&biz_no=967" },
      { version: "ID_PASS", saleType: "set", price: 61600, currency: "KRW", url: "https://kr.ktown4u.com/eventinfo?eve_no=44113596&biz_no=967" },
      { version: "POCAALBUM", saleType: "random", price: 7000, currency: "KRW", url: "https://kr.ktown4u.com/eventinfo?eve_no=44113596&biz_no=967" },
      { version: "POCAALBUM", saleType: "set", price: 34900, currency: "KRW", url: "https://kr.ktown4u.com/eventinfo?eve_no=44113596&biz_no=967" },
    ],
    benefits: [
      { type: "other", name: "빌보드 광고", description: "빌보드 광고 x3", isExclusive: false },
    ],
    chartReflection: ["한터", "써클"],
  },
  {
    id: "gp_buffs",
    name: "버프즈",
    country: "KR",
    currency: "KRW",
    type: "group_purchase",
    organizer: "음원총공팀",
    deadline: "2026-04-03 23:59",
    shippingFee: 0,
    shippingNote: "무조건 무료",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 19000, currency: "KRW" },
      { version: "INVENTORY", saleType: "random", price: 16245, currency: "KRW" },
      { version: "INVENTORY", saleType: "set", price: 81225, currency: "KRW" },
      { version: "ID_PASS", saleType: "random", price: 14155, currency: "KRW" },
      { version: "ID_PASS", saleType: "set", price: 70775, currency: "KRW" },
      { version: "POCAALBUM", saleType: "random", price: 7790, currency: "KRW" },
      { version: "POCAALBUM", saleType: "set", price: 38950, currency: "KRW" },
    ],
    benefits: [],
    notes: ["신규회원 1만원 할인 + 10% 적립금"],
  },
  {
    id: "gp_09platform_tower",
    name: "타워레코드 (09Platform)",
    country: "KR",
    currency: "KRW",
    type: "group_purchase",
    organizer: "음원총공팀",
    originalRetailer: "Tower Records",
    deadline: "2026-03-29 23:59",
    shippingFee: 11500,
    shippingNote: "11,500원 고정",
    products: [
      { version: "ID_PASS", saleType: "random", price: 24410, currency: "KRW" },
      { version: "ID_PASS", saleType: "set", price: 122060, currency: "KRW" },
    ],
    benefits: [
      { type: "photocard", name: "타워레코 미공포 (도안 B)", description: "멤버별 포토카드 5종 (단품 1장 랜덤 / 세트 5장 1세트, 도안 미공개)", isExclusive: true, versions: ["ID_PASS"], image: "/benefits/tower.png" },
    ],
    chartReflection: ["한터", "써클", "오리콘", "Billboard JP"],
    notes: ["품절 시 조기마감", "1·2차 합배송 불가", "출고 5월 초~중반 예정", "일본 가격: 랜덤 ¥2,420 / 세트 ¥12,100"],
  },
  {
    id: "gp_09platform_hmv",
    name: "HMV (09Platform)",
    country: "KR",
    currency: "KRW",
    type: "group_purchase",
    organizer: "음원총공팀",
    originalRetailer: "HMV",
    deadline: "2026-03-29 23:59",
    shippingFee: 11500,
    shippingNote: "11,500원 고정",
    products: [
      { version: "ID_PASS", saleType: "random", price: 24410, currency: "KRW" },
      { version: "ID_PASS", saleType: "set", price: 122060, currency: "KRW" },
    ],
    benefits: [
      { type: "photocard", name: "HMV 미공포 (도안 A)", description: "멤버별 포토카드 5종 (단품 1장 랜덤 / 세트 5장 1세트, 도안 미공개)", isExclusive: true, versions: ["ID_PASS"], image: "/benefits/hmv.png" },
    ],
    chartReflection: ["한터", "써클", "오리콘", "Billboard JP"],
    notes: ["품절 시 조기마감", "1·2차 합배송 불가", "출고 5월 초~중반 예정", "일본 가격: 랜덤 ¥2,420 / 세트 ¥12,100"],
  },
  {
    id: "gp_hottown_tme",
    name: "홋타운 (TME / QQ)",
    country: "KR",
    currency: "KRW",
    type: "group_purchase",
    organizer: "홋타운",
    originalRetailer: "QQ Music (TME)",
    deadline: "2026-04-13 16:00",
    shippingFee: 22537,
    shippingNote: "국제운송료 22,537원 (30% 할인쿠폰 제공)",
    products: [
      { version: "PHOTOBOOK", saleType: "set", price: 113418, currency: "KRW" },
    ],
    benefits: [
      { type: "photocard", name: "TME 독점 미공포", description: "TME 미공개 포토카드 5종 중 1종 랜덤 (세트 구매 시 중복없이 5장)", isExclusive: true, versions: ["PHOTOBOOK"], image: "/benefits/tme.png" },
    ],
    notes: ["수량 소진 조기 마감 (4/13)", "1차 품절 마감", "2차 오픈: 앨범 1장 랜덤 구성만 진행, 5장 이상 구매 시에도 세트 구성 불가", "한국만 배송"],
  },
  {
    id: "gp_hottown_will",
    name: "홋타운 (WillMusic)",
    country: "KR",
    currency: "KRW",
    type: "group_purchase",
    organizer: "홋타운",
    originalRetailer: "WillMusic",
    deadline: "2026-04-13 20:00",
    shippingFee: 23682,
    shippingNote: "국제운송료 23,682원 (50% 할인쿠폰 제공)",
    products: [
      { version: "POCAALBUM", saleType: "set", price: 52532, currency: "KRW", url: "https://www.hoottown.com/sell/sellDtl?P2603240000021802=&utm_campaign=mopromo&utm_content=plave_will_set&utm_medium=social&utm_source=X" },
    ],
    benefits: [
      { type: "photocard", name: "WillMusic 독점 미공포", description: "WillMusic 미공개 특전 미니카드 (세트 구매 시 중복없이 5장)", isExclusive: true, versions: ["POCAALBUM"], image: "/benefits/will.png" },
    ],
    notes: ["판매처 수량 제한 요청으로 조기 마감 (4/13)", "한국만 배송", "출고: 발매일(4/14) 이후 순차발송"],
  },

  // ═══ 추가 공구 ═══
  {
    id: "gp_beatroad_cafe",
    name: "비트로드 카페 (총공팀카페)",
    country: "KR",
    currency: "KRW",
    type: "group_purchase",
    organizer: "음원총공팀",
    deadline: "2026-04-20 22:00",
    shippingFee: null,
    shippingNote: "확인 예정",
    products: [],
    benefits: [],
    salePeriods: [
      { type: "offline", store: "서울 마포구 잔다리로6길 35 3층", start: "2026-04-14", end: "2026-04-20 22:00" },
    ],
    notes: ["앨범/특전 미정", "집계 마감일 당일 23시까지 차트 집계", "충분한 재고 예정", "현장 소진 시 배송 가능"],
  },
  {
    id: "gp_09platform_tower2",
    name: "타워레코드 2차 (09Platform)",
    country: "KR",
    currency: "KRW",
    type: "group_purchase",
    organizer: "음원총공팀",
    url: "https://09platform.com/surl/P/1312",
    originalRetailer: "Tower Records",
    deadline: "2026-04-07 18:00",
    shippingFee: 11500,
    shippingNote: "11,500원 고정",
    products: [
      { version: "ID_PASS", saleType: "random", price: 24410, currency: "KRW", url: "https://09platform.com/surl/P/1312" },
      { version: "ID_PASS", saleType: "set", price: 122060, currency: "KRW", url: "https://09platform.com/surl/P/1312" },
    ],
    benefits: [
      { type: "photocard", name: "타워레코 미공포 (도안 B)", description: "멤버별 포토카드 5종 (단품 1장 랜덤 / 세트 5장 1세트)", isExclusive: true, versions: ["ID_PASS"], image: "/benefits/tower.png" },
    ],
    chartReflection: ["한터", "써클", "오리콘", "Billboard JP"],
    salePeriods: [
      { type: "online", start: "2026-03-30", end: "2026-04-07 18:00" },
    ],
    notes: ["1차와 묶음 배송 불가", "출고 5월 중~말 예상", "품절 시 조기마감"],
  },
  {
    id: "gp_09platform_hmv2",
    name: "HMV 2차 (09Platform)",
    country: "KR",
    currency: "KRW",
    type: "group_purchase",
    organizer: "음원총공팀",
    url: "https://09platform.com/surl/P/1312",
    originalRetailer: "HMV",
    deadline: "2026-04-07 18:00",
    shippingFee: 11500,
    shippingNote: "11,500원 고정",
    products: [
      { version: "ID_PASS", saleType: "random", price: 24410, currency: "KRW", url: "https://09platform.com/surl/P/1312" },
      { version: "ID_PASS", saleType: "set", price: 122060, currency: "KRW", url: "https://09platform.com/surl/P/1312" },
    ],
    benefits: [
      { type: "photocard", name: "HMV 미공포 (도안 A)", description: "멤버별 포토카드 5종 (단품 1장 랜덤 / 세트 5장 1세트)", isExclusive: true, versions: ["ID_PASS"], image: "/benefits/hmv.png" },
    ],
    chartReflection: ["한터", "써클", "오리콘", "Billboard JP"],
    salePeriods: [
      { type: "online", start: "2026-03-30", end: "2026-04-07 18:00" },
    ],
    notes: ["1차와 묶음 배송 불가", "출고 5월 중~말 예상", "품절 시 조기마감"],
  },

  // ═══ 영상통화 이벤트 ═══
  {
    id: "musicplant",
    name: "뮤직플랜트",
    country: "KR",
    currency: "KRW",
    type: "retailer",
    url: "https://www.musicplant.co.kr",
    shippingFee: 0,
    shippingNote: "무료배송",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 20000, currency: "KRW", url: "https://www.musicplant.co.kr/shop/search_result.php?search_str=%ED%94%8C%EB%A0%88%EC%9D%B4%EB%B8%8C&x=0&y=0" },
      { version: "ID_PASS", saleType: "random", price: 14900, currency: "KRW", url: "https://www.musicplant.co.kr/shop/search_result.php?search_str=%ED%94%8C%EB%A0%88%EC%9D%B4%EB%B8%8C&x=0&y=0" },
      { version: "ID_PASS", saleType: "set", price: 74500, currency: "KRW", url: "https://www.musicplant.co.kr/shop/search_result.php?search_str=%ED%94%8C%EB%A0%88%EC%9D%B4%EB%B8%8C&x=0&y=0" },
      { version: "INVENTORY", saleType: "random", price: 17100, currency: "KRW", url: "https://www.musicplant.co.kr/shop/search_result.php?search_str=%ED%94%8C%EB%A0%88%EC%9D%B4%EB%B8%8C&x=0&y=0" },
      { version: "INVENTORY", saleType: "set", price: 85500, currency: "KRW", url: "https://www.musicplant.co.kr/shop/search_result.php?search_str=%ED%94%8C%EB%A0%88%EC%9D%B4%EB%B8%8C&x=0&y=0" },
      { version: "POCAALBUM", saleType: "random", price: 8200, currency: "KRW", url: "https://www.musicplant.co.kr/shop/search_result.php?search_str=%ED%94%8C%EB%A0%88%EC%9D%B4%EB%B8%8C&x=0&y=0" },
      { version: "POCAALBUM", saleType: "set", price: 41000, currency: "KRW", url: "https://www.musicplant.co.kr/shop/search_result.php?search_str=%ED%94%8C%EB%A0%88%EC%9D%B4%EB%B8%8C&x=0&y=0" },
    ],
    benefits: [
      { type: "photocard", name: "뮤직플랜트 미공포", description: "미공개 포토카드 5종 중 1종 랜덤 (2개 이상 구매 시 중복없이, 앨범 중복 가능)", isExclusive: true, versions: ["INVENTORY"], image: "/benefits/music-P.png" },
      { type: "event", name: "영상통화 이벤트 2차", description: "INVENTORY 구매 시 영상통화 이벤트 응모 (50명 추첨, 영통 4/26)", isExclusive: false, versions: ["INVENTORY"] },
    ],
    salePeriods: [
      { type: "online", start: "2026-03-28 11:00", end: "2026-04-14 23:59" },
      { type: "online", store: "영상통화 이벤트 응모", start: "2026-03-28 11:00", end: "2026-03-31 23:59", versions: ["INVENTORY"] },
    ],
  },
  {
    id: "soundwave",
    name: "사운드웨이브",
    country: "KR",
    currency: "KRW",
    type: "retailer",
    url: "https://sound-wave.co.kr",
    shippingFee: 3000,
    shippingFreeOver: 50000,
    shippingNote: "5만원 이상 무료",
    deadline: "2026-04-08 23:59",
    products: [
      { version: "INVENTORY", saleType: "random", price: 17100, currency: "KRW", url: "https://sound-wave.co.kr/product/0510-11%EC%98%81%ED%86%B5-%ED%94%8C%EB%A0%88%EC%9D%B4%EB%B8%8Cplave-4th-mini-album-caligo-pt2-inventory-ver5%EC%A2%85-%EC%A4%91-1%EC%A2%85-%EB%9E%9C%EB%8D%A4-/25575/category/406/display/1/" },
    ],
    benefits: [
      { type: "photocard", name: "사운드웨이브 미공포", description: "미공개 포토카드 5종 중 1종 랜덤 (1:1, 2장 이상 구매 시 중복없이)", isExclusive: true, versions: ["INVENTORY"], image: "/benefits/soundwave.png" },
      { type: "event", name: "영상통화 이벤트 4차", description: "INVENTORY 구매 시 1:1 영상통화 응모 (50명 추첨, 멤버당 10명, 영통 5/10, 당첨 발표 4/9 14:00)", isExclusive: false, versions: ["INVENTORY"] },
    ],
    salePeriods: [
      { type: "online", start: "2026-04-05 11:00", end: "2026-04-08 23:59", versions: ["INVENTORY"] },
    ],
    notes: ["적립금/쿠폰 사용 불가", "주문 취소/환불 불가", "디스코드·WeChat으로만 영통 진행", "영통 미응모 시 미응모 선택 필수 (구매 후 변경 불가)", "응모기간 내 구매 시 자동 응모, 당첨 발표 1시간 전까지 취소 가능"],
  },
  {
    id: "withmuu",
    name: "위드뮤",
    country: "KR",
    currency: "KRW",
    type: "retailer",
    url: "https://withmuu.com",
    shippingFee: 3000,
    shippingNote: "3,000원",
    deadline: "2026-04-16 23:59",
    products: [
      { version: "INVENTORY", saleType: "random", price: 17100, currency: "KRW", url: "https://withmuu.com/goods/event_sale.php?sno=1333" },
    ],
    benefits: [
      { type: "photocard", name: "위드뮤 응모자 미공포", description: "미공개 셀카 포토카드 5종 중 1종 랜덤 (앨범 1장당 1장, 2장 이상 구매 시 중복없이)", isExclusive: true, versions: ["INVENTORY"], image: "/benefits/withmuu.png" },
      { type: "event", name: "영상통화 이벤트 6차", description: "INVENTORY 구매 시 1:1 영상통화 응모 (50명 추첨, 멤버당 10명, 영통 5/23, 당첨 발표 4/17 14:00, 당첨자 전원 친필사인 포토카드 1장 증정)", isExclusive: false, versions: ["INVENTORY"] },
    ],
    salePeriods: [
      { type: "online", start: "2026-04-13 11:00", end: "2026-04-16 23:59", versions: ["INVENTORY"] },
    ],
    notes: ["구매 후 주문 취소/환불/교환 불가", "도서산간 불가지역·해외 배송 불가", "무통장 입금 선택 시 주문 자동 취소", "멤버 중복 응모 가능"],
  },
  {
    id: "izuwi",
    name: "이즈위 (withfans)",
    country: "CN",
    currency: "CNY",
    type: "retailer",
    shippingFee: 35,
    shippingNote: "중국 국내 배송 ¥35 (배대지→한국 별도)",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 156, currency: "CNY" },
      { version: "ID_PASS", saleType: "random", price: 78, currency: "CNY" },
      { version: "INVENTORY", saleType: "random", price: 88, currency: "CNY" },
      { version: "POCAALBUM", saleType: "random", price: 46, currency: "CNY" },
    ],
    benefits: [
      { type: "photocard", name: "이즈위 미공포", description: "미공개 포토카드 5종 중 1종 랜덤", isExclusive: true, versions: ["PHOTOBOOK"], image: "/benefits/withfan.png" },
      { type: "event", name: "영상통화 이벤트 3차", description: "PHOTOBOOK 구매 시 영상통화 이벤트 응모 (당첨 발표 4/7 18:00 CST, 영통 5/9)", isExclusive: false, versions: ["PHOTOBOOK"] },
    ],
    salePeriods: [
      { type: "online", start: "2026-04-01 11:00", end: "2026-04-04 22:59" },
    ],
    notes: ["중국 시간 기준 (CST)", "미공포 불포함 POCAALBUM 102위안 별도"],
  },

  // ═══ 오프라인 / 팝업 ═══
  {
    id: "popup_hyundai",
    name: "Caligo Pt.2 POP-UP (더현대서울)",
    country: "KR",
    currency: "KRW",
    type: "official",
    url: "https://caligopt2popup.oopy.io/32d4cacd-15c9-80e1-b7b5-d07592ac0481",
    shippingFee: null,
    products: [],
    benefits: [
      { type: "photocard", name: "POP-UP 미공포", description: "Caligo Pt.2 모든 버전 구매 시 미공개 포토카드 (플레이브 친필싸인 포토카드 랜덤 제공)", isExclusive: true },
    ],
    salePeriods: [
      { type: "offline", store: "더현대 서울 5F Epic Seoul", start: "2026-04-14 10:30", end: "2026-04-19 20:30" },
    ],
    notes: ["화·목 10:30~20:00 / 금~일 10:30~20:30", "4/13 정기휴무일"],
  },

  // ═══ 모금기부 ═══
  {
    id: "gp_ktown4u_donation",
    name: "케타포 모금기부",
    country: "KR",
    currency: "KRW",
    type: "group_purchase",
    organizer: "음원총공팀",
    deadline: "2026-04-20 15:00",
    shippingFee: null,
    products: [
      { version: "POCAALBUM", saleType: "random", price: 6700, currency: "KRW", url: "https://x.com/Plave_Album/status/2036645750793548004?s=20" },
    ],
    benefits: [],
    chartReflection: ["한터", "써클"],
    notes: ["카카오뱅크 3333-2843-44254 ㅂㅁㅈ", "6,700원 = POCAALBUM 1장 반영", "1원 단위 입금 가능"],
  },

  // ═══ 위버스샵 일본 ═══
  {
    id: "weverse_jp",
    name: "위버스샵 일본",
    country: "JP",
    currency: "KRW",
    type: "retailer",
    url: "https://shop.weverse.io",
    shippingFee: 800,
    shippingNote: "¥800 (일본 국내)",
    deadline: "2026-04-20",
    products: [
      { version: "INVENTORY", saleType: "set", price: 119625, currency: "KRW", url: "https://shop.weverse.io/ko/shop/KRW/artists/167/sales/56689" },
      { version: "POCAALBUM", saleType: "set", price: 57420, currency: "KRW", url: "https://shop.weverse.io/ko/shop/KRW/artists/167/sales/56691" },
      { version: "PHOTOBOOK", saleType: "single", price: 28231, currency: "KRW", url: "https://shop.weverse.io/ko/shop/KRW/artists/167/sales/56852" },
    ],
    benefits: [
      { type: "other", name: "컨셉포토 A 엽서", description: "INVENTORY 구매 시 포스트카드 컨셉포토A 5매 증정", isExclusive: false, versions: ["INVENTORY"] },
      { type: "photocard", name: "위버스 일본 미공포 (E)", description: "POCAALBUM 구매 시 미공개 포토카드 5종 1세트 (미공개 도안 E)", isExclusive: true, versions: ["POCAALBUM"], image: "/benefits/wevers-jp.jpeg" },
      { type: "photocard", name: "위버스 일본 영통 미공포 (D)", description: "영통 응모 구매 시 멤버별 포토카드 1장 (5종 랜덤, 미공개 도안 D)", isExclusive: true, versions: ["PHOTOBOOK"], image: "/benefits/universal-weverse-jp.jpeg" },
    ],
    salePeriods: [
      { type: "online", start: "2026-04-07 11:00", end: "2026-04-20" },
      { type: "online", start: "2026-04-09 11:00", end: "2026-04-12 23:59" },
    ],
    notes: ["6/9 일본 발매", "특전 소진시 마감", "앨범 최대 5개 구매", "영통 1인 20개까지", "영통: 4/9~4/12, PHOTOBOOK Ver. 단품", "배송 6/9~6/23 (KST)"],
  },

  {
    id: "universal_music_jp",
    name: "UNIVERSAL MUSIC STORE",
    country: "JP",
    currency: "JPY",
    type: "retailer",
    url: "https://store-annex.universal-music.co.jp",
    shippingFee: 0,
    shippingNote: "무료 (일본 국내)",
    deadline: "2026-04-12",
    products: [
      { version: "PHOTOBOOK", saleType: "single", price: 3245, currency: "JPY", url: "https://store-annex.universal-music.co.jp/product/dsku15815/" },
    ],
    benefits: [
      { type: "photocard", name: "영통 미공포 (D)", description: "멤버별 포토카드 1장 (5종 랜덤, 미공개 도안 D, 위버스샵 일본과 동일)", isExclusive: true, versions: ["PHOTOBOOK"], image: "/benefits/universal-weverse-jp.jpeg" },
    ],
    salePeriods: [
      { type: "online", start: "2026-04-09 11:00", end: "2026-04-12 23:59" },
    ],
    notes: ["영통 응모 상품 (5/17 온라인 토크)", "구매 시 자동 응모", "당첨발표 4월 하순", "Discord/WeChat 1:1 2분 영상통화", "일본 국내 발송만 가능", "6/9 일본 발매"],
  },

  // ═══ 추가 판매처 ═══
  {
    id: "animate_kr",
    name: "Animate (국내)",
    country: "KR",
    currency: "KRW",
    type: "retailer",
    url: "https://animate-onlineshop.co.kr",
    shippingFee: 3000,
    shippingFreeOver: 50000,
    shippingNote: "5만원 이상 무료",
    products: [
      { version: "ID_PASS", saleType: "random", price: 14900, currency: "KRW", url: "https://animate-onlineshop.co.kr/goods/goods_view.php?goodsNo=1000088779" },
      { version: "ID_PASS", saleType: "set", price: 74500, currency: "KRW", url: "https://animate-onlineshop.co.kr/goods/goods_view.php?goodsNo=1000089045" },
    ],
    benefits: [
      { type: "photocard", name: "Animate 한정 미공포 (패턴C)", description: "미공개 포토카드 5종 (단품 랜덤 1장 / 세트 5장 1세트, 특전 소진 시 종료)", isExclusive: true, versions: ["ID_PASS"], image: "/benefits/animate.png" },
    ],
    deadline: "2026-04-13",
    notes: ["특전 소진 시 조기마감", "일본 가격: 랜덤 ¥2,420 / 세트 ¥12,100 (국내와 동일 특전)"],
    salePeriods: [
      { type: "online", start: "2026-03-24 11:00", end: "2026-04-13" },
    ],
  },
  {
    id: "ktown4u_luckydraw",
    name: "Ktown4u 럭키드로우",
    country: "KR",
    currency: "KRW",
    type: "retailer",
    url: "https://kr.ktown4u.com/eventinfo?eve_no=44148946&biz_no=967",
    shippingFee: 3000,
    shippingFreeOver: 30000,
    shippingNote: "3만원 이상 무료",
    deadline: "2026-04-20 20:00",
    products: [
      { version: "POCAALBUM", saleType: "random", price: 8200, currency: "KRW", url: "https://kr.ktown4u.com/eventinfo?eve_no=44148946&biz_no=967" },
      { version: "POCAALBUM", saleType: "set", price: 41000, currency: "KRW", url: "https://kr.ktown4u.com/eventinfo?eve_no=44148946&biz_no=967" },
    ],
    benefits: [
      { type: "photocard", name: "Ktown4u 럭드로 미공포", description: "POCAALBUM 1장당 미공개 포토카드 5종 중 1종 랜덤 (1:1)", isExclusive: true, versions: ["POCAALBUM"], image: "/benefits/kt4.png" },
    ],
    salePeriods: [
      { type: "online", start: "2026-04-14 11:00", end: "2026-04-20 20:00", versions: ["POCAALBUM"] },
    ],
    notes: ["4/14 판매 시작 — 상세 정보 미정", "결제 완료 기준 판매 기간", "kr/us/jp.ktown4u.com 공통 이벤트"],
  },
  {
    id: "asterum",
    name: "ASTERUM 433-10",
    country: "KR",
    currency: "KRW",
    type: "official",
    url: "https://caligopt2popup.oopy.io/32d4cacd-15c9-80d4-91e3-e505275bb65c",
    shippingFee: null,
    products: [],
    benefits: [
      { type: "photocard", name: "ASTERUM 미공포", description: "Caligo Pt.2 모든 버전 구매 시 미공개 포토카드 (A2T DRAW와 동일)", isExclusive: true },
    ],
    salePeriods: [
      { type: "offline", store: "서울 서대문구 연희로11가길 48-23 Asterum 433-10", start: "2026-04-20 15:00", end: "2026-04-20 23:00" },
    ],
    notes: ["예약 없이 방문 가능"],
  },
];

export function formatPrice(price: number, currency: Currency): string {
  switch (currency) {
    case "KRW": return `${price.toLocaleString()}원`;
    case "JPY": return `¥${price.toLocaleString()}`;
    case "USD": return `$${price.toFixed(2)}`;
    case "TWD": return `NT$${price.toLocaleString()}`;
    case "CNY": return `¥${price.toLocaleString()}`;
    default: return `${price.toLocaleString()}`;
  }
}

export function getShippingDisplay(retailer: Retailer): string {
  if (retailer.shippingFee === null) return retailer.shippingNote ?? "확인필요";
  if (retailer.shippingNote) return retailer.shippingNote;
  if (retailer.shippingFee === 0) return "무료";
  if (retailer.shippingFee === null) return "별도";
  return formatPrice(retailer.shippingFee, "KRW");
}
