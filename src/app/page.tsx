"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Heart } from "lucide-react";
import { ALBUM_SPECS, COLLECTION_REQUIREMENTS, AlbumVersion } from "@/data/albums";
import { RETAILERS, Retailer, formatPrice, getShippingFee, getShippingDisplay, Currency } from "@/data/retailers";
import { Purchase, Adjustment, getPurchases, savePurchase, deletePurchase, isPurchased, isBenefitOwned, setBenefitOwned } from "@/lib/purchases";
import { getSyncCode, setSyncCode, clearSyncCode, createSync, connectSync, pushSync, pullSync, autoPush, autoPull } from "@/lib/sync";
import { initAnalytics, trackEvent } from "@/lib/analytics";
import VersionBadge from "@/components/VersionBadge";

const VERSIONS: AlbumVersion[] = ["PHOTOBOOK", "ID_PASS", "INVENTORY", "POCAALBUM"];

// 환율 기본값 (API 실패 시 폴백)
const DEFAULT_EXCHANGE_RATES: Record<Currency, number> = {
  KRW: 1,
  JPY: 9.6,
  USD: 1450,
  TWD: 44,
  CNY: 200,
};

interface ExchangeRateState {
  rates: Record<Currency, number>;
  updatedAt: string | null; // ISO string
  isLive: boolean; // API에서 가져왔는지 여부
}

function useExchangeRates(): ExchangeRateState {
  const [state, setState] = useState<ExchangeRateState>({
    rates: DEFAULT_EXCHANGE_RATES,
    updatedAt: null,
    isLive: false,
  });

  useEffect(() => {
    const cached = localStorage.getItem("exchangeRates");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // 6시간 이내면 캐시 사용
        if (Date.now() - parsed.fetchedAt < 6 * 60 * 60 * 1000) {
          setState({ rates: parsed.rates, updatedAt: parsed.updatedAt, isLive: true });
          return;
        }
      } catch { /* ignore */ }
    }

    fetch("https://open.er-api.com/v6/latest/KRW")
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          const r = data.rates;
          const rates: Record<Currency, number> = {
            KRW: 1,
            JPY: r.JPY ? Math.round((1 / r.JPY) * 10) / 10 : DEFAULT_EXCHANGE_RATES.JPY,
            USD: r.USD ? Math.round(1 / r.USD) : DEFAULT_EXCHANGE_RATES.USD,
            TWD: r.TWD ? Math.round(1 / r.TWD) : DEFAULT_EXCHANGE_RATES.TWD,
            CNY: r.CNY ? Math.round(1 / r.CNY) : DEFAULT_EXCHANGE_RATES.CNY,
          };
          const updatedAt = new Date().toISOString();
          setState({ rates, updatedAt, isLive: true });
          localStorage.setItem("exchangeRates", JSON.stringify({ rates, updatedAt, fetchedAt: Date.now() }));
        }
      })
      .catch(() => { /* 폴백 유지 */ });
  }, []);

  return state;
}

const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? "";

const UPDATE_LOG = [
  { date: "2026.04.14", message: "위드뮤·Ktown4u 럭키드로우·PLAVE 유튜브 스토어 추가, 판매처 리스트 섹션별 그룹핑, 카드 상세 버튼 개선, 미공포 페이지 개편" },
  { date: "2026.04.09", message: "위버스JP/UNIVERSAL MUSIC 영통 추가, 미공포 D 이미지 공개, 마감 판매처 하단 정렬, 구매 제외 필터 추가" },
  { date: "2026.04.07", message: "위버스샵 일본 추가, hello82 미공포 이미지 공개, 데이터 업데이트" },
];
const LATEST_UPDATE = UPDATE_LOG[0];

type SectionKey = "공구" | "영통" | "국내" | "해외" | "closed";
const SECTION_CONFIG: Array<{ key: SectionKey; icon: string; label: string }> = [
  { key: "공구", icon: "📦", label: "공구" },
  { key: "영통", icon: "📞", label: "영상통화 이벤트" },
  { key: "국내", icon: "🇰🇷", label: "국내" },
  { key: "해외", icon: "🌏", label: "해외" },
  { key: "closed", icon: "⏱", label: "마감됨" },
];

function toKRW(price: number, currency: Currency, rates: Record<Currency, number>): number {
  return Math.round(price * rates[currency]);
}

function formatKRWWithOriginal(price: number, currency: Currency, rates: Record<Currency, number>): string {
  if (currency === "KRW") return formatPrice(price, "KRW");
  const krw = toKRW(price, currency, rates);
  return `${krw.toLocaleString()}원 (${formatPrice(price, currency)})`;
}

// 포토북 제외 나머지: 세트 없으면 개별×5로 세트 가격 계산
function getSetPrice(retailer: Retailer, version: AlbumVersion): { price: number; currency: Currency; isCalculated: boolean; saleType: "set" | "random" | "single" } | null {
  const products = retailer.products.filter((p) => p.version === version);
  const setP = products.find((p) => p.saleType === "set");
  if (setP) return { price: setP.price, currency: setP.currency, isCalculated: false, saleType: "set" };

  // 포토북은 개별이 정상
  if (version === "PHOTOBOOK") {
    const single = products.find((p) => p.saleType === "single" || p.saleType === "random");
    if (single) return { price: single.price, currency: single.currency, isCalculated: false, saleType: single.saleType };
    return null;
  }

  // 나머지: 개별×5 = 세트 가격으로 계산
  const rand = products.find((p) => p.saleType === "random" || p.saleType === "single");
  if (rand) return { price: rand.price * 5, currency: rand.currency, isCalculated: true, saleType: rand.saleType };
  return null;
}

interface CartItem {
  retailerId: string;
  version: AlbumVersion;
  saleType: "set" | "random" | "single";
  quantity: number;
  unitPrice: number;
  currency: Currency;
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<AlbumVersion>("ID_PASS");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [expandedRetailer, setExpandedRetailer] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [benefitState, setBenefitState] = useState<Record<string, boolean>>({});
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"list" | "cart" | "benefits" | "purchases">("list");
  const [showCalendar, setShowCalendar] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(true);
  const [purchaseModal, setPurchaseModal] = useState<{ retailerId: string; version: AlbumVersion; editId?: string } | null>(null);
  const [purchaseFormQty, setPurchaseFormQty] = useState(1);
  const [purchaseFormAdj, setPurchaseFormAdj] = useState<Adjustment[]>([]);
  const [purchaseFormNotes, setPurchaseFormNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "cart" | "purchased" | "closed">("all");
  const [excludePurchased, setExcludePurchased] = useState(false);
  const [sortBy, setSortBy] = useState<"price" | "deadline" | "exclusive">("exclusive");
  const [syncCode, setSyncCodeState] = useState<string | null>(null);
  const [syncInput, setSyncInput] = useState("");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [showSync, setShowSync] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<SectionKey>>(new Set(["closed"]));
  const exchangeRate = useExchangeRates();

  // Load from localStorage + auto pull from server
  useEffect(() => {
    initAnalytics();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
    const load = async () => {
      setSyncCodeState(getSyncCode());
      setLastSaved(localStorage.getItem("plave-caligo-last-saved"));
      setUpdateDismissed(localStorage.getItem("plave-update-dismissed") === LATEST_UPDATE.date);
      // 서버에서 먼저 가져오기 (동기화 코드 있으면)
      const pulled = await autoPull();
      // localStorage에서 로드 (pull 성공하면 이미 업데이트됨)
      setPurchases(getPurchases());
      const stored = localStorage.getItem("plave-caligo-benefits");
      if (stored) setBenefitState(JSON.parse(stored));
      const storedCart = localStorage.getItem("plave-caligo-cart");
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        const cleaned = parsed.filter((c: CartItem) => RETAILERS.some((r) => r.id === c.retailerId));
        if (cleaned.length !== parsed.length) localStorage.setItem("plave-caligo-cart", JSON.stringify(cleaned));
        setCart(cleaned);
      }
      if (pulled) setSyncStatus("동기화 완료");
      setTimeout(() => setSyncStatus(null), 2000);
    };
    load();
  }, []);

  // Save cart to localStorage + auto push
  useEffect(() => {
    if (cart.length > 0 || localStorage.getItem("plave-caligo-cart")) {
      localStorage.setItem("plave-caligo-cart", JSON.stringify(cart));
      autoPush();
    }
  }, [cart]);

  const reloadPurchases = useCallback(() => {
    setPurchases(getPurchases());
    autoPush();
  }, []);

  // Helper: get deadline for a retailer
  const getDeadlineDate = useCallback((r: Retailer) => {
    const deadlineStr = r.deadline || r.salePeriods?.find((sp) => sp.type === "online" && (!sp.versions || sp.versions.includes(activeTab)))?.end;
    if (!deadlineStr) return null;
    return new Date(deadlineStr.replace(" ", "T"));
  }, [activeTab]);

  // Retailers filtered by version + status, sorted by option
  const retailers = useMemo(() => {
    const now = new Date();
    return RETAILERS.filter((r) => {
      if (!r.products.some((p) => p.version === activeTab)) return false;
      // Exclude purchased toggle
      if (excludePurchased && purchases.some((p) => p.retailerId === r.id && p.version === activeTab)) return false;
      // Status filter
      if (statusFilter === "available") {
        const d = getDeadlineDate(r);
        if (d && d < now) return false;
        return !purchases.some((p) => p.retailerId === r.id && p.version === activeTab);
      }
      if (statusFilter === "cart") return cart.some((c) => c.retailerId === r.id && c.version === activeTab);
      if (statusFilter === "purchased") return purchases.some((p) => p.retailerId === r.id && p.version === activeTab);
      if (statusFilter === "closed") {
        const d = getDeadlineDate(r);
        return d ? d < now : false;
      }
      return true;
    }).sort((a, b) => {
      // Closed items always at bottom
      const aDeadline = getDeadlineDate(a);
      const bDeadline = getDeadlineDate(b);
      const aClosed = aDeadline ? aDeadline < now : false;
      const bClosed = bDeadline ? bDeadline < now : false;
      if (aClosed && !bClosed) return 1;
      if (!aClosed && bClosed) return -1;

      if (sortBy === "exclusive") {
        const aExcl = a.benefits.some((b) => b.isExclusive && (!b.versions || b.versions.includes(activeTab)));
        const bExcl = b.benefits.some((b) => b.isExclusive && (!b.versions || b.versions.includes(activeTab)));
        if (aExcl && !bExcl) return -1;
        if (!aExcl && bExcl) return 1;
      }
      if (sortBy === "deadline") {
        const aD = getDeadlineDate(a);
        const bD = getDeadlineDate(b);
        if (aD && !bD) return -1;
        if (!aD && bD) return 1;
        if (aD && bD) return aD.getTime() - bD.getTime();
      }
      // Always fallback to price sort
      const getPriceForSort = (r: Retailer) => {
        const sp = getSetPrice(r, activeTab);
        if (!sp) return Infinity;
        const priceKRW = toKRW(sp.price, sp.currency, exchangeRate.rates);
        const shipping = getShippingFee(r, sp.price);
        return priceKRW + (shipping !== null ? toKRW(shipping, r.currency, exchangeRate.rates) : 0);
      };
      return getPriceForSort(a) - getPriceForSort(b);
    });
  }, [activeTab, exchangeRate.rates, statusFilter, excludePurchased, sortBy, cart, purchases, getDeadlineDate]);

  // 섹션 분류: 마감 > 영통 > 공구 > 해외 > 국내
  const categorize = useCallback((r: Retailer): SectionKey => {
    const deadline = getDeadlineDate(r);
    if (deadline && deadline < new Date()) return "closed";
    const has영통 = r.benefits.some((b) =>
      b.type === "event" &&
      b.description.includes("영상통화") &&
      (!b.versions || b.versions.includes(activeTab))
    );
    if (has영통) return "영통";
    if (r.type === "group_purchase") return "공구";
    if (r.country !== "KR") return "해외";
    return "국내";
  }, [activeTab, getDeadlineDate]);

  const groupedRetailers = useMemo(() => {
    const groups: Record<SectionKey, Retailer[]> = {
      "공구": [],
      "영통": [],
      "국내": [],
      "해외": [],
      "closed": [],
    };
    retailers.forEach((r) => {
      groups[categorize(r)].push(r);
    });
    return groups;
  }, [retailers, categorize]);

  const toggleSection = useCallback((key: SectionKey) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Cart helpers
  const isInCart = (retailerId: string) => cart.some((c) => c.retailerId === retailerId && c.version === activeTab);

  const toggleCart = useCallback((retailer: Retailer) => {
    setCart((prev) => {
      const exists = prev.find((c) => c.retailerId === retailer.id && c.version === activeTab);
      if (exists) {
        trackEvent("wishlist_remove", { retailer: retailer.name, version: activeTab });
        return prev.filter((c) => !(c.retailerId === retailer.id && c.version === activeTab));
      }
      const sp = getSetPrice(retailer, activeTab);
      if (!sp) return prev;
      trackEvent("wishlist_add", { retailer: retailer.name, version: activeTab });
      const products = retailer.products.filter((p) => p.version === activeTab);
      const hasRealSet = products.some((p) => p.saleType === "set");
      return [...prev, {
        retailerId: retailer.id,
        version: activeTab,
        saleType: hasRealSet ? "set" as const : sp.saleType,
        quantity: hasRealSet ? 1 : (activeTab === "PHOTOBOOK" ? 1 : 5),
        unitPrice: hasRealSet ? sp.price : (sp.price / (activeTab === "PHOTOBOOK" ? 1 : 5)),
        currency: sp.currency,
      }];
    });
  }, [activeTab]);

  const updateCartItem = useCallback((retailerId: string, version: AlbumVersion, updates: Partial<CartItem>) => {
    setCart((prev) => prev.map((c) => {
      if (c.retailerId === retailerId && c.version === version) return { ...c, ...updates };
      return c;
    }));
  }, []);

  const removeCartItem = useCallback((retailerId: string, version: AlbumVersion) => {
    setCart((prev) => prev.filter((c) => !(c.retailerId === retailerId && c.version === version)));
  }, []);

  // Cart totals
  const cartItemsWithShipping = useMemo(() => {
    return cart.map((item) => {
      const retailer = RETAILERS.find((r) => r.id === item.retailerId);
      const itemTotal = item.unitPrice * item.quantity;
      const shipping = retailer ? getShippingFee(retailer, itemTotal) : null;
      return { ...item, retailer, itemTotal, shipping };
    });
  }, [cart]);

  const cartTotalKRW = cartItemsWithShipping
    .reduce((s, c) => {
      const itemKRW = toKRW(c.itemTotal + (c.shipping ?? 0), c.currency, exchangeRate.rates);
      return s + itemKRW;
    }, 0);

  // 드볼 progress (장바구니 + 구매 내역 합산)
  const dbolRequirements = COLLECTION_REQUIREMENTS.map((req) => {
    const cartAlbums = cart.filter((c) => c.version === req.version)
      .reduce((sum, c) => sum + (c.saleType === "set" ? 5 * c.quantity : c.quantity), 0);
    const purchasedAlbums = purchases.filter((p) => p.version === req.version)
      .reduce((sum, p) => sum + (p.saleType === "set" ? 5 * p.quantity : p.quantity), 0);
    const totalAlbums = cartAlbums + purchasedAlbums;
    return { ...req, current: totalAlbums, met: totalAlbums >= req.minAlbums };
  });

  // Purchase helpers
  const handleMarkPurchased = useCallback((retailerId: string, version: AlbumVersion) => {
    const cartItem = cart.find((c) => c.retailerId === retailerId && c.version === version);
    const retailer = RETAILERS.find((r) => r.id === retailerId);
    if (!cartItem || !retailer) return;
    const shipping = getShippingFee(retailer, cartItem.unitPrice * cartItem.quantity) ?? 0;
    const purchase: Purchase = {
      id: genId(),
      retailerId,
      version,
      saleType: cartItem.saleType,
      quantity: cartItem.quantity,
      totalPrice: cartItem.unitPrice * cartItem.quantity + shipping,
      discount: 0,
      extra: 0,
      currency: cartItem.currency,
      purchaseDate: new Date().toISOString().slice(0, 10),
      notes: "",
    };
    savePurchase(purchase);
    removeCartItem(retailerId, version);
    reloadPurchases();
  }, [cart, removeCartItem, reloadPurchases]);

  const handleDeletePurchase = useCallback((id: string) => {
    if (!confirm("구매 내역을 삭제하시겠습니까?")) return;
    deletePurchase(id);
    reloadPurchases();
  }, [reloadPurchases]);

  // Benefit ownership toggle
  const toggleBenefit = useCallback((retailerId: string, benefitName: string) => {
    const key = `${retailerId}::${benefitName}`;
    const current = benefitState[key] ?? false;
    setBenefitOwned(retailerId, benefitName, !current);
    setBenefitState((prev) => ({ ...prev, [key]: !current }));
    autoPush();
  }, [benefitState]);

  const isBenefitChecked = (retailerId: string, benefitName: string) => benefitState[`${retailerId}::${benefitName}`] ?? false;
  const isPurchasedCheck = (retailerId: string) => purchases.some((p) => p.retailerId === retailerId && p.version === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">앨범 판매처</h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">체크박스로 위시리스트 담기 · 카드 클릭으로 상세 보기</p>
          </div>
          {/* Desktop: buttons next to title */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setShowSync(!showSync); if (!showSync) trackEvent("open_sync"); }}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${syncCode ? "border-green-500/30 text-green-600 hover:border-green-500" : "border-border text-muted hover:text-foreground hover:border-muted"}`}
            >
              {syncCode ? `🔗 ${syncCode}` : "🔄 동기화"}
            </button>
            <Link href="/benefits" onClick={() => trackEvent("open_benefits")} className="text-xs px-3 py-1.5 rounded border border-border text-muted hover:text-foreground hover:border-muted transition-colors">🃏 미공포</Link>
            <button onClick={() => { setShowCalendar(true); trackEvent("open_calendar"); }} className="text-xs px-3 py-1.5 rounded border border-border text-muted hover:text-foreground hover:border-muted transition-colors">📅 일정</button>
            <a href="https://album-sales.plavestream.com/" target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded border border-border text-muted hover:text-foreground hover:border-muted transition-colors">📊 음총팀</a>
            <button onClick={() => { setShowGuide(true); trackEvent("open_guide"); }} className="text-xs px-3 py-1.5 rounded border border-border text-muted hover:text-foreground hover:border-muted transition-colors">사용 가이드</button>
          </div>
        </div>
        {/* Mobile: sync + sheet + guide */}
        <div className="flex sm:hidden items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowSync(!showSync)}
            className={`text-[11px] px-2 py-1 rounded border transition-colors ${syncCode ? "border-green-500/30 text-green-600 hover:border-green-500" : "border-border text-muted hover:text-foreground hover:border-muted"}`}
          >
            {syncCode ? `🔗 ${syncCode}` : "🔄 동기화"}
          </button>
          <a href="https://album-sales.plavestream.com/" target="_blank" rel="noopener noreferrer" className="text-[11px] px-2 py-1 rounded border border-border text-muted hover:text-foreground hover:border-muted transition-colors">📊 음총팀</a>
          <button onClick={() => { setShowGuide(true); trackEvent("open_guide"); }} className="text-[11px] px-2 py-1 rounded border border-border text-muted hover:text-foreground hover:border-muted transition-colors">사용 가이드</button>
        </div>
        <div className="text-[10px] text-muted space-y-0.5">
          <p>📋 판매처 정보: {BUILD_TIME} 기준{lastSaved && <> · 🕐 저장: {new Date(lastSaved).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</>}</p>
          {exchangeRate.updatedAt && (
            <p>💱 환율: {new Date(exchangeRate.updatedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 기준 (1 USD = {exchangeRate.rates.USD.toLocaleString()}원)</p>
          )}
        </div>
        {/* Update toast is rendered as fixed element below */}
      </div>

      {/* Sync panel */}
      {showSync && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">기기 간 동기화</h3>
            <button onClick={() => setShowSync(false)} className="text-muted hover:text-foreground text-xs">✕</button>
          </div>

          {syncCode ? (
            <div className="space-y-3">
              <p className="text-xs text-muted">데이터 변경 시 자동으로 동기화됩니다. 다른 기기에서 아래 코드를 입력하세요.</p>
              <div className="flex items-center gap-2 bg-background rounded px-3 py-2">
                <span className="text-xs text-muted">내 코드:</span>
                <span className="font-mono font-bold tracking-widest">{syncCode}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(syncCode); setSyncStatus("코드 복사됨!"); setTimeout(() => setSyncStatus(null), 2000); }}
                  className="text-xs text-muted hover:text-foreground ml-auto"
                >복사</button>
              </div>
              <button
                onClick={async () => {
                  setSyncStatus("저장 중...");
                  const r = await pushSync();
                  if (r.success) { const now = new Date().toISOString(); localStorage.setItem("plave-caligo-last-saved", now); setLastSaved(now); }
                  setSyncStatus(r.success ? "저장 완료!" : r.error ?? "실패");
                  setTimeout(() => setSyncStatus(null), 2000);
                }}
                className="w-full text-xs py-2 rounded border border-border hover:border-muted transition-colors"
              >수동 저장</button>
              <button
                onClick={() => { clearSyncCode(); setSyncCodeState(null); setSyncStatus(null); }}
                className="text-[10px] text-muted hover:text-red-500"
              >연결 해제</button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted">동기화 코드를 생성하면 다른 기기에서도 데이터를 사용할 수 있습니다.</p>
              <button
                onClick={async () => {
                  setSyncStatus("생성 중...");
                  const r = await createSync();
                  if (r.code) { setSyncCodeState(r.code); setSyncStatus("코드 생성 완료!"); trackEvent("sync_create"); }
                  else setSyncStatus(r.error ?? "실패");
                  setTimeout(() => setSyncStatus(null), 2000);
                }}
                className="w-full text-xs py-2 rounded border border-border hover:border-muted transition-colors"
              >새 동기화 코드 생성</button>
              <div className="text-xs text-muted text-center">또는 기존 코드 입력</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="6자리 코드"
                  value={syncInput}
                  onChange={(e) => setSyncInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="flex-1 text-xs px-3 py-1.5 rounded border border-border bg-background font-mono tracking-widest text-center"
                />
                <button
                  onClick={async () => {
                    if (syncInput.length !== 6) { setSyncStatus("6자리 코드를 입력하세요"); setTimeout(() => setSyncStatus(null), 2000); return; }
                    setSyncStatus("연결 중...");
                    const r = await connectSync(syncInput);
                    if (r.success) {
                      setSyncCodeState(syncInput);
                      setPurchases(getPurchases());
                      const stored = localStorage.getItem("plave-caligo-benefits");
                      if (stored) setBenefitState(JSON.parse(stored));
                      const storedCart = localStorage.getItem("plave-caligo-cart");
                      if (storedCart) setCart(JSON.parse(storedCart));
                      setSyncStatus("연결 완료!"); trackEvent("sync_connect");
                    } else {
                      setSyncStatus(r.error ?? "실패");
                    }
                    setTimeout(() => setSyncStatus(null), 2000);
                  }}
                  className="text-xs px-4 py-1.5 rounded border border-border hover:border-muted transition-colors"
                >연결</button>
              </div>
            </div>
          )}
          {syncStatus && <p className="text-xs text-center text-muted">{syncStatus}</p>}
        </div>
      )}

      {/* Version tabs */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {VERSIONS.map((v) => {
          const spec = ALBUM_SPECS.find((a) => a.version === v)!;
          const count = RETAILERS.filter((r) => r.products.some((p) => p.version === v)).length;
          return (
            <button
              key={v}
              onClick={() => { setActiveTab(v); setMobilePanel("list"); trackEvent("version_tab", { version: v }); }}
              className={`rounded-lg p-2 sm:p-3 border text-left transition-all ${
                activeTab === v ? "shadow-sm" : "border-border hover:border-muted bg-card"
              }`}
              style={activeTab === v ? { borderColor: spec.color, backgroundColor: spec.colorBg } : {}}
            >
              <span className="text-[10px] sm:text-xs font-semibold block truncate" style={{ color: spec.color }}>{spec.label}</span>
              <div className="flex items-baseline gap-0.5 sm:gap-1 mt-0.5">
                <span className="text-xs sm:text-sm font-bold">{spec.priceSet ? `${spec.priceSet.toLocaleString()}원` : `${spec.priceRandom.toLocaleString()}원`}</span>
              </div>
              <span className="text-[10px] sm:text-xs text-muted">{count}곳</span>
            </button>
          );
        })}
      </div>

      {/* Filter + Sort bar — 판매처 탭에서만 표시 */}
      <div className={`flex items-center gap-2 flex-wrap ${mobilePanel !== "list" ? "hidden lg:flex" : ""}`}>
        <div className="flex gap-1 flex-1 min-w-0 overflow-x-auto">
          {([["all", "전체"], ["available", "미구매"], ["cart", "위시리스트"], ["purchased", "구매완료"], ["closed", "마감"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(key); trackEvent("filter_change", { filter: key }); }}
              className={`text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors ${statusFilter === key ? "bg-accent text-white border-accent" : "border-border text-muted hover:border-muted"}`}
            >{label}</button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-[11px] text-muted cursor-pointer whitespace-nowrap select-none">
          <input
            type="checkbox"
            checked={excludePurchased}
            onChange={() => { setExcludePurchased(!excludePurchased); trackEvent("filter_change", { filter: excludePurchased ? "include_purchased" : "exclude_purchased" }); }}
            className="w-3 h-3 accent-accent"
          />
          구매 제외
        </label>
        <select
          value={sortBy}
          onChange={(e) => { const v = e.target.value as "price" | "deadline" | "exclusive"; setSortBy(v); trackEvent("sort_change", { sort: v }); }}
          className="text-[11px] px-2 py-1 rounded border border-border bg-card text-muted"
        >
          <option value="exclusive">미공포 우선</option>
          <option value="price">가격 낮은순</option>
          <option value="deadline">마감 임박순</option>
        </select>
      </div>

      {/* Main: list + panel */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 pb-20 lg:pb-0">
        {/* Left: retailer list */}
        <div className={`flex-1 min-w-0 space-y-4 ${mobilePanel !== "list" ? "hidden lg:block" : ""}`}>
          {SECTION_CONFIG.map(({ key: sectionKey, icon, label }) => {
            const items = groupedRetailers[sectionKey];
            if (items.length === 0) return null;
            // "closed" 섹션은 statusFilter가 "closed"면 자동 펼침
            const isCollapsed = collapsedSections.has(sectionKey) && !(sectionKey === "closed" && statusFilter === "closed");
            return (
              <div key={sectionKey} className="space-y-2">
                <button
                  onClick={() => toggleSection(sectionKey)}
                  className="w-full flex items-center gap-2 px-1 pt-2 pb-1.5 text-left border-b border-border/60 hover:opacity-70 transition-opacity group"
                >
                  <span className="text-sm">{icon}</span>
                  <span className="font-bold text-sm tracking-tight">{label}</span>
                  <span className="text-[11px] text-muted font-normal">{items.length}</span>
                  <span className="ml-auto text-xs text-muted group-hover:text-foreground font-normal">
                    {isCollapsed ? "더보기" : "접기"}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-2">
                    {items.map((r) => {
            const products = r.products.filter((p) => p.version === activeTab);
            const sp = getSetPrice(r, activeTab);
            const exclusives = r.benefits.filter((b) => b.isExclusive && (!b.versions || b.versions.includes(activeTab)));
            const hasExclusive = exclusives.length > 0;
            const inCart = isInCart(r.id);
            const isExpanded = expandedRetailer === r.id;
            const purchased = isPurchasedCheck(r.id);
            const deadlineDate = getDeadlineDate(r);
            const isClosed = deadlineDate ? deadlineDate < new Date() : false;
            const displayPrice = sp?.price ?? 0;
            const displayCurrency = sp?.currency ?? "KRW";
            const shipping = sp ? getShippingFee(r, displayPrice) : null;
            const totalWithShipping = shipping !== null && shipping > 0 ? displayPrice + shipping : null;

            return (
              <div key={r.id} id={`retailer-${r.id}`} className={`rounded-lg border overflow-hidden transition-colors ${
                isClosed ? "border-border bg-card opacity-40 grayscale-[30%]" : purchased ? "border-border bg-card opacity-60" : inCart ? "border-accent bg-accent-light" : "border-border bg-card"
              }`}>
                {/* Main row */}
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCart(r); }}
                    className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center text-xs transition-colors ${
                      inCart ? "bg-accent border-accent text-white" : "border-border hover:border-muted"
                    }`}
                  >
                    {inCart && "✓"}
                  </button>

                  {/* Info - clickable to expand */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => { setExpandedRetailer(isExpanded ? null : r.id); if (!isExpanded) trackEvent("retailer_detail", { retailer: r.name }); }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm">{r.name}</span>
                      {hasExclusive && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ color: "var(--exclusive)", backgroundColor: "var(--exclusive-bg)" }}>
                          미공포
                        </span>
                      )}
                      {purchased && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-accent/15 text-accent">
                          구매완료
                        </span>
                      )}
                    </div>
                    {(() => {
                      const deadlineStr = r.deadline || r.salePeriods?.find((sp) => sp.type === "online" && (!sp.versions || sp.versions.includes(activeTab)))?.end;
                      if (!deadlineStr) return null;
                      const deadline = new Date(deadlineStr.replace(" ", "T"));
                      const now = new Date();
                      // 날짜만 비교 (시간 제거)
                      const deadlineDay = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
                      const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      const diff = Math.round((deadlineDay.getTime() - todayDay.getTime()) / (1000 * 60 * 60 * 24));
                      if (diff < 0) return <p className="text-xs text-muted mt-0.5">마감됨</p>;
                      return (
                        <p className={`text-xs mt-0.5 ${diff <= 3 ? "text-red-500 font-medium" : "text-muted"}`}>
                          {diff === 0 ? "오늘 마감" : `D-${diff}`}
                        </p>
                      );
                    })()}
                    {r.originalRetailer && (
                      <p className="text-xs text-muted">원 판매처: {r.originalRetailer}</p>
                    )}
                  </div>

                  {/* Price */}
                  <div
                    className="text-right flex-shrink-0 cursor-pointer"
                    onClick={() => { setExpandedRetailer(isExpanded ? null : r.id); if (!isExpanded) trackEvent("retailer_detail", { retailer: r.name }); }}
                  >
                    <div className="font-semibold text-sm">
                      {displayCurrency !== "KRW"
                        ? formatKRWWithOriginal(totalWithShipping ?? displayPrice, displayCurrency, exchangeRate.rates)
                        : totalWithShipping !== null
                          ? formatPrice(totalWithShipping, "KRW")
                          : formatPrice(displayPrice, "KRW")
                      }
                    </div>
                    <div className="text-xs text-muted">
                      {sp?.isCalculated ? "개별×5" : sp?.saleType === "set" ? "세트" : activeTab === "PHOTOBOOK" ? "개별" : "랜덤"}
                      {shipping !== null && shipping > 0 && <span> (배송비 포함)</span>}
                      {shipping === null && <span className="text-amber-600"> + 배송비</span>}
                    </div>
                  </div>

                  {/* Chevron — visual detail affordance */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedRetailer(isExpanded ? null : r.id); if (!isExpanded) trackEvent("retailer_detail", { retailer: r.name }); }}
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-card-hover transition-colors"
                    aria-label={isExpanded ? "접기" : "자세히 보기"}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-3 sm:px-4 py-4 bg-card-hover space-y-4 text-sm">
                    {/* Prices */}
                    <div>
                      <p className="text-xs text-muted font-medium mb-2">가격</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                        {products.map((p, i) => {
                          const s = getShippingFee(r, p.price);
                          return (
                            <div key={i} className="flex justify-between text-xs bg-background rounded px-2 py-1.5">
                              <span className="text-muted">{p.saleType === "set" ? "세트 (5종)" : p.saleType === "random" ? "랜덤 (1종)" : "개별"}</span>
                              <span>
                                {p.currency !== "KRW" ? formatKRWWithOriginal(p.price, p.currency, exchangeRate.rates) : formatPrice(p.price, "KRW")}
                                {s !== null && s > 0 && <span className="text-muted"> +{formatPrice(s, "KRW")}</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Exclusive benefits with images */}
                    {exclusives.length > 0 && (
                      <div>
                        <p className="text-xs text-muted font-medium mb-2">독점 특전</p>
                        {exclusives.map((b, i) => (
                          <div key={i} className="flex items-start gap-3 mb-3">
                            {b.image ? (
                              <img
                                src={b.image}
                                alt={b.name}
                                className="w-20 h-20 sm:w-28 sm:h-28 rounded-md object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); setLightboxImg(b.image!); }}
                              />
                            ) : (
                              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-md bg-border flex items-center justify-center text-xs text-muted flex-shrink-0">
                                이미지<br/>준비중
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium" style={{ color: "var(--exclusive)" }}>{b.name}</p>
                              <p className="text-xs text-muted mt-1">{b.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Non-exclusive benefits */}
                    {r.benefits.filter((b) => !b.isExclusive && (!b.versions || b.versions.includes(activeTab))).length > 0 && (
                      <div>
                        <p className="text-xs text-muted font-medium mb-1">기타 특전</p>
                        {r.benefits.filter((b) => !b.isExclusive && (!b.versions || b.versions.includes(activeTab))).map((b, i) => (
                          <p key={i} className="text-xs text-muted">{b.name} — {b.description}</p>
                        ))}
                      </div>
                    )}

                    {/* Shipping / deadline / sale periods */}
                    <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-1 text-xs">
                      {r.deadline && <div><span className="text-muted">마감: </span>{r.deadline}</div>}
                      {r.chartReflection && <div><span className="text-muted">차트: </span>{r.chartReflection.join(", ")}</div>}
                    </div>

                    {r.salePeriods && r.salePeriods.filter((sp) => !sp.versions || sp.versions.includes(activeTab)).length > 0 && (
                      <div className="text-xs space-y-0.5">
                        {r.salePeriods.filter((sp) => !sp.versions || sp.versions.includes(activeTab)).map((sp, i) => (
                          <p key={i} className="text-muted">
                            {sp.type === "online" ? "온라인" : `오프라인 (${sp.store})`}: {sp.start} ~ {sp.end}
                          </p>
                        ))}
                      </div>
                    )}

                    {r.notes && r.notes.length > 0 && (
                      <div className="text-xs text-muted">{r.notes.map((n, i) => <p key={i}>· {n}</p>)}</div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      {(() => {
                        const productUrl = r.products.find((p) => p.version === activeTab && p.url)?.url;
                        const linkUrl = productUrl || r.url;
                        if (!linkUrl) return null;
                        return (
                          <a
                            href={linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackEvent("buy_link_click", { retailer: r.name, version: activeTab })}
                            className="text-xs px-3 py-1.5 rounded bg-accent text-white hover:opacity-90 transition-opacity"
                          >
                            구매하러 가기 →
                          </a>
                        );
                      })()}
                      {!purchased && (
                        <button
                          onClick={() => handleMarkPurchased(r.id, activeTab)}
                          className="text-xs px-3 py-1.5 rounded border border-accent text-accent hover:bg-accent-light transition-colors"
                        >
                          구매 완료 표시
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: panels */}
        <div className={`w-full lg:w-80 flex-shrink-0 ${mobilePanel === "list" ? "hidden lg:block" : ""}`}>
          <div className="lg:sticky lg:top-16 space-y-4">

            {/* Wishlist */}
            <div className={`bg-card rounded-lg border border-border p-4 ${mobilePanel !== "cart" && mobilePanel !== "list" ? "hidden lg:block" : ""}`}>
              <h2 className="font-semibold text-sm mb-3">위시리스트</h2>
              {cart.length === 0 ? (
                <p className="text-xs text-muted py-3 text-center">체크박스를 눌러 위시리스트에 담아보세요</p>
              ) : (
                <>
                <div className="space-y-1">
                  {cart.map((item) => {
                    const retailer = RETAILERS.find((r) => r.id === item.retailerId);
                    if (!retailer) return null;
                    const hasExclusive = retailer.benefits.some((b) => b.isExclusive && (!b.versions || b.versions.includes(item.version)));
                    const sp = getSetPrice(retailer, item.version);
                    const itemTotal = item.unitPrice * item.quantity;
                    const shipping = sp ? getShippingFee(retailer, itemTotal) : null;
                    const displayTotal = itemTotal + (shipping ?? 0);
                    const cur = sp?.currency ?? "KRW";
                    return (
                      <div
                        key={`${item.retailerId}-${item.version}`}
                        className="rounded-md px-2 py-2 hover:bg-background cursor-pointer transition-colors group space-y-1"
                        onClick={() => {
                          setActiveTab(item.version);
                          setExpandedRetailer(item.retailerId);
                          setMobilePanel("list");
                          setTimeout(() => {
                            document.getElementById(`retailer-${item.retailerId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }, 100);
                        }}
                      >
                        {/* Row 1: name + badges */}
                        <div className="flex items-center gap-1.5">
                          <VersionBadge version={item.version} />
                          <span className="text-xs flex-1 truncate">{retailer.name}</span>
                          {hasExclusive && (
                            <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ color: "var(--exclusive)", backgroundColor: "var(--exclusive-bg)" }}>미공포</span>
                          )}
                        </div>
                        {/* Row 2: quantity + price */}
                        <div className="flex items-center gap-2 pl-1" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => item.quantity > 1 && updateCartItem(item.retailerId, item.version, { quantity: item.quantity - 1 })}
                              className="w-5 h-5 rounded border border-border text-xs flex items-center justify-center hover:bg-background"
                            >−</button>
                            <span className="text-xs w-4 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateCartItem(item.retailerId, item.version, { quantity: item.quantity + 1 })}
                              className="w-5 h-5 rounded border border-border text-xs flex items-center justify-center hover:bg-background"
                            >+</button>
                          </div>
                          <span className="text-[11px] text-muted flex-1">
                            {cur !== "KRW" ? formatKRWWithOriginal(displayTotal, cur, exchangeRate.rates) : formatPrice(displayTotal, "KRW")}
                          </span>
                          <button
                            onClick={() => {
                              setPurchaseFormQty(item.quantity);
                              setPurchaseFormAdj([]);
                              setPurchaseFormNotes("");
                              setPurchaseModal({ retailerId: item.retailerId, version: item.version });
                            }}
                            className="text-xs px-2.5 py-1 rounded bg-accent text-white hover:opacity-90"
                          >구매체크</button>
                          <button
                            onClick={() => {
                              if (confirm(`${retailer.name}을(를) 위시리스트에서 삭제할까요?`)) {
                                removeCartItem(item.retailerId, item.version);
                              }
                            }}
                            className="text-xs px-2.5 py-1 rounded border border-border text-muted hover:text-red-500 hover:border-red-300"
                          >삭제</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between items-center">
                  <span className="text-xs text-muted">합계</span>
                  <span className="text-sm font-bold text-accent">{formatPrice(cartTotalKRW, "KRW")}</span>
                </div>
                </>
              )}
            </div>

            {/* 구매 내역 */}
            {purchases.length > 0 && (
              <div className={`bg-card rounded-lg border border-border p-4 ${mobilePanel !== "purchases" && mobilePanel !== "list" ? "hidden lg:block" : ""}`}>
                <h2 className="font-semibold text-sm mb-3">구매 내역</h2>
                <div className="space-y-2">
                  {purchases.map((p) => {
                    const retailer = RETAILERS.find((r) => r.id === p.retailerId);
                    return (
                      <div
                        key={p.id}
                        className="border-b border-border pb-2 last:border-0 cursor-pointer hover:bg-background rounded px-1 -mx-1 transition-colors"
                        onClick={() => {
                          setPurchaseFormQty(p.quantity);
                          setPurchaseFormAdj(p.adjustments ?? [
                            ...(p.discount > 0 ? [{ type: "discount" as const, amount: p.discount, currency: "KRW" as Currency, amountKRW: p.discount, note: "" }] : []),
                            ...((p.extra ?? 0) > 0 ? [{ type: "extra" as const, amount: p.extra ?? 0, currency: "KRW" as Currency, amountKRW: p.extra ?? 0, note: "" }] : []),
                          ]);
                          setPurchaseFormNotes(p.notes);
                          setPurchaseModal({ retailerId: p.retailerId, version: p.version, editId: p.id });
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <VersionBadge version={p.version} />
                            <span className="text-xs truncate">{retailer?.name}</span>
                            <span className="text-[10px] text-muted">×{p.quantity}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-medium">{formatPrice(p.totalPrice, "KRW")}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDeletePurchase(p.id); }} className="text-xs text-muted hover:text-foreground">×</button>
                          </div>
                        </div>
                        {(p.adjustments?.length || p.discount > 0 || (p.extra ?? 0) > 0 || p.notes) && (
                          <div className="flex items-center gap-2 mt-0.5 ml-7 flex-wrap">
                            {(p.adjustments ?? []).filter((a) => a.type === "discount").map((a, i) => (
                              <span key={`d${i}`} className="text-[10px] text-red-500">-{formatPrice(a.amountKRW, "KRW")}{a.note ? ` ${a.note}` : ""}</span>
                            ))}
                            {(p.adjustments ?? []).filter((a) => a.type === "extra").map((a, i) => (
                              <span key={`e${i}`} className="text-[10px] text-amber-600">+{formatPrice(a.amountKRW, "KRW")}{a.note ? ` ${a.note}` : ""}</span>
                            ))}
                            {!p.adjustments && p.discount > 0 && <span className="text-[10px] text-red-500">-{formatPrice(p.discount, "KRW")} 할인</span>}
                            {!p.adjustments && (p.extra ?? 0) > 0 && <span className="text-[10px] text-amber-600">+{formatPrice(p.extra ?? 0, "KRW")} 추가</span>}
                            {p.notes && <span className="text-[10px] text-muted">{p.notes}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-border pt-2 mt-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">총 지출</span>
                    <span className="font-medium">{formatPrice(purchases.reduce((s, p) => s + toKRW(p.totalPrice, p.currency, exchangeRate.rates), 0), "KRW")}</span>
                  </div>
                  {purchases.some((p) => p.discount > 0) && (
                    <div className="flex justify-between text-red-500">
                      <span>총 할인</span>
                      <span>-{formatPrice(purchases.reduce((s, p) => s + toKRW(p.discount ?? 0, p.currency, exchangeRate.rates), 0), "KRW")}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 드볼 진행도 */}
            <div className={`bg-card rounded-lg border border-border p-4 ${mobilePanel !== "purchases" && mobilePanel !== "list" ? "hidden lg:block" : ""}`}>
              <h2 className="font-semibold text-sm mb-3">드볼 진행도</h2>
              <div className="space-y-2">
                {dbolRequirements.map((req) => {
                  const spec = ALBUM_SPECS.find((a) => a.version === req.version)!;
                  const pct = Math.min(100, (req.current / req.minAlbums) * 100);
                  return (
                    <div key={req.version}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: spec.color }}>{spec.label}</span>
                        <span className={req.met ? "text-accent font-medium" : "text-muted"}>
                          {req.current}/{req.minAlbums}장
                        </span>
                      </div>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: req.met ? "var(--accent)" : spec.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border lg:hidden">
        <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
          {([
            ["list", "판매처", "🏪"],
            ["cart", "위시리스트", "heart"],
            ["purchases", "구매내역", "📦"],
          ] as const).map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => { setMobilePanel(key); trackEvent("mobile_nav", { tab: key }); }}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                mobilePanel === key ? "text-accent" : "text-muted"
              }`}
            >
              {icon === "heart" ? (
                <Heart size={20} className="fill-purple-500 text-purple-500" />
              ) : (
                <span className="text-lg">{icon}</span>
              )}
              <span className="text-[10px]">{label}{key === "cart" && cart.length > 0 ? ` (${cart.length})` : ""}</span>
            </button>
          ))}
          <Link
            href="/benefits"
            onClick={() => trackEvent("open_benefits")}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors text-muted"
          >
            <span className="text-lg">🃏</span>
            <span className="text-[10px]">미공포</span>
          </Link>
          <button
            onClick={() => { setShowCalendar(true); trackEvent("open_calendar"); }}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors text-muted"
          >
            <span className="text-lg">📅</span>
            <span className="text-[10px]">일정</span>
          </button>
        </div>
      </div>

      {/* Purchase modal */}
      {purchaseModal && (() => {
        const retailer = RETAILERS.find((r) => r.id === purchaseModal.retailerId);
        if (!retailer) return null;
        const isEdit = !!purchaseModal.editId;
        const existingPurchase = isEdit ? purchases.find((p) => p.id === purchaseModal.editId) : null;
        const cartItem = cart.find((c) => c.retailerId === purchaseModal.retailerId && c.version === purchaseModal.version);
        const saleType = existingPurchase?.saleType ?? cartItem?.saleType ?? "random";
        const sp = getSetPrice(retailer, purchaseModal.version);
        const cur = sp?.currency ?? "KRW";
        // sp.price는 세트 가격, 개별 단가 = 세트가 ÷ 5 (실제 set 상품이 있거나 PHOTOBOOK이면 나누지 않음)
        const modalProducts = retailer.products.filter((p) => p.version === purchaseModal.version);
        const modalHasRealSet = modalProducts.some((p) => p.saleType === "set");
        const modalDivisor = (modalHasRealSet || purchaseModal.version === "PHOTOBOOK") ? 1 : 5;
        const modalUnitPrice = sp ? sp.price / modalDivisor : 0;
        const itemTotal = modalUnitPrice * purchaseFormQty;
        const shipping = sp ? getShippingFee(retailer, itemTotal) : null;
        const baseKRW = toKRW(itemTotal + (shipping ?? 0), cur, exchangeRate.rates);
        const totalDiscountKRW = purchaseFormAdj.filter((a) => a.type === "discount").reduce((s, a) => s + a.amountKRW, 0);
        const totalExtraKRW = purchaseFormAdj.filter((a) => a.type === "extra").reduce((s, a) => s + a.amountKRW, 0);
        const finalKRW = baseKRW - totalDiscountKRW + totalExtraKRW;
        const curOpts: { value: Currency; label: string }[] = [
          { value: "KRW", label: "KRW (₩)" }, { value: "USD", label: "USD ($)" },
          { value: "JPY", label: "JPY (엔)" }, { value: "TWD", label: "TWD (대만)" }, { value: "CNY", label: "CNY (위안)" },
        ];
        const addAdj = (type: "discount" | "extra") => {
          setPurchaseFormAdj((prev) => [...prev, { type, amount: 0, currency: "KRW", amountKRW: 0, note: "" }]);
        };
        const updateAdj = (idx: number, field: string, val: string | number) => {
          setPurchaseFormAdj((prev) => prev.map((a, i) => {
            if (i !== idx) return a;
            const updated = { ...a, [field]: val };
            if (field === "amount" || field === "currency") {
              const amt = field === "amount" ? Number(val) || 0 : a.amount;
              const c = field === "currency" ? val as Currency : a.currency;
              updated.amount = amt;
              updated.currency = c;
              updated.amountKRW = toKRW(amt, c, exchangeRate.rates);
            }
            return updated;
          }));
        };
        const removeAdj = (idx: number) => setPurchaseFormAdj((prev) => prev.filter((_, i) => i !== idx));
        return (
          <div className="fixed top-0 left-0 w-screen h-screen z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPurchaseModal(null)}>
            <div className="bg-card rounded-xl border border-border p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{isEdit ? "구매 내역 수정" : "구매 완료"}</h3>
                <button onClick={() => setPurchaseModal(null)} className="text-muted hover:text-foreground">✕</button>
              </div>
              <div className="text-sm">
                <span className="font-medium">{retailer.name}</span>
                <span className="text-muted ml-2">{ALBUM_SPECS.find((a) => a.version === purchaseModal.version)?.label}</span>
              </div>
              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-xs text-muted">수량</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => purchaseFormQty > 1 && setPurchaseFormQty((q) => q - 1)} className="w-7 h-7 rounded border border-border text-sm flex items-center justify-center hover:bg-background">−</button>
                  <span className="text-sm font-medium w-6 text-center">{purchaseFormQty}</span>
                  <button onClick={() => setPurchaseFormQty((q) => q + 1)} className="w-7 h-7 rounded border border-border text-sm flex items-center justify-center hover:bg-background">+</button>
                  <span className="text-xs text-muted ml-auto">
                    {cur !== "KRW" ? formatKRWWithOriginal(itemTotal, cur, exchangeRate.rates) : formatPrice(itemTotal, "KRW")}
                  </span>
                </div>
              </div>
              {/* Adjustments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted">할인 / 추가금액</label>
                  <div className="flex gap-1">
                    <button onClick={() => addAdj("discount")} className="text-[10px] px-2 py-0.5 rounded border border-red-300 text-red-500 hover:bg-red-50">+ 할인</button>
                    <button onClick={() => addAdj("extra")} className="text-[10px] px-2 py-0.5 rounded border border-amber-400 text-amber-600 hover:bg-amber-50">+ 추가</button>
                  </div>
                </div>
                {purchaseFormAdj.map((adj, idx) => (
                  <div key={idx} className={`rounded-lg border p-2.5 space-y-1.5 ${adj.type === "discount" ? "border-red-200 bg-red-50/30" : "border-amber-200 bg-amber-50/30"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-medium ${adj.type === "discount" ? "text-red-500" : "text-amber-600"}`}>
                        {adj.type === "discount" ? "할인" : "추가금액"}
                      </span>
                      <button onClick={() => removeAdj(idx)} className="text-muted hover:text-foreground text-xs">✕</button>
                    </div>
                    <div className="flex gap-1.5">
                      <select
                        value={adj.currency}
                        onChange={(e) => updateAdj(idx, "currency", e.target.value)}
                        className="text-[11px] px-1.5 py-1.5 rounded border border-border bg-background w-[85px]"
                      >
                        {curOpts.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      <input
                        type="number"
                        value={adj.amount || ""}
                        onChange={(e) => updateAdj(idx, "amount", e.target.value)}
                        placeholder="0"
                        className="flex-1 text-sm px-2 py-1.5 rounded border border-border bg-background min-w-0"
                      />
                    </div>
                    <input
                      type="text"
                      value={adj.note}
                      onChange={(e) => updateAdj(idx, "note", e.target.value)}
                      placeholder="사유 (카카오페이, 배대지 등)"
                      className="w-full text-[11px] px-2 py-1 rounded border border-border bg-background"
                    />
                    {adj.amount > 0 && adj.currency !== "KRW" && (
                      <p className="text-[10px] text-muted">= {formatPrice(adj.amountKRW, "KRW")}</p>
                    )}
                  </div>
                ))}
              </div>
              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs text-muted">메모 (선택)</label>
                <input
                  type="text"
                  value={purchaseFormNotes}
                  onChange={(e) => setPurchaseFormNotes(e.target.value)}
                  placeholder="기타 메모"
                  className="w-full text-sm px-3 py-2 rounded border border-border bg-background"
                />
              </div>
              {/* Summary */}
              <div className="border-t border-border pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-xs text-muted">
                  <span>상품+배송비</span>
                  <span>{formatPrice(baseKRW, "KRW")}</span>
                </div>
                {purchaseFormAdj.filter((a) => a.type === "discount" && a.amountKRW > 0).map((a, i) => (
                  <div key={`d${i}`} className="flex justify-between text-xs text-red-500">
                    <span>할인{a.note ? ` (${a.note})` : ""}{a.currency !== "KRW" ? ` ${formatPrice(a.amount, a.currency)}` : ""}</span>
                    <span>-{formatPrice(a.amountKRW, "KRW")}</span>
                  </div>
                ))}
                {purchaseFormAdj.filter((a) => a.type === "extra" && a.amountKRW > 0).map((a, i) => (
                  <div key={`e${i}`} className="flex justify-between text-xs text-amber-600">
                    <span>추가{a.note ? ` (${a.note})` : ""}{a.currency !== "KRW" ? ` ${formatPrice(a.amount, a.currency)}` : ""}</span>
                    <span>+{formatPrice(a.amountKRW, "KRW")}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-1 border-t border-border">
                  <span>최종 결제</span>
                  <span className="text-accent">{formatPrice(finalKRW, "KRW")}</span>
                </div>
              </div>
              {/* Submit */}
              <button
                onClick={() => {
                  const purchase: Purchase = {
                    id: purchaseModal.editId ?? genId(),
                    retailerId: purchaseModal.retailerId,
                    version: purchaseModal.version,
                    saleType: saleType,
                    quantity: purchaseFormQty,
                    totalPrice: finalKRW,
                    discount: totalDiscountKRW,
                    extra: totalExtraKRW,
                    adjustments: purchaseFormAdj.filter((a) => a.amountKRW > 0),
                    currency: "KRW",
                    purchaseDate: existingPurchase?.purchaseDate ?? new Date().toISOString().slice(0, 10),
                    notes: purchaseFormNotes,
                  };
                  savePurchase(purchase);
                  trackEvent(isEdit ? "purchase_edit" : "purchase_complete", { retailer: retailer.name, version: purchaseModal.version, amount: finalKRW });
                  if (!isEdit) removeCartItem(purchaseModal.retailerId, purchaseModal.version);
                  reloadPurchases();
                  setPurchaseModal(null);
                }}
                className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {isEdit ? "저장" : "구매 완료"}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Guide modal */}
      {showGuide && (
        <div className="fixed top-0 left-0 w-screen h-screen z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowGuide(false)}>
          <div className="bg-card rounded-xl border border-border p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">사용 가이드</h2>
              <button onClick={() => setShowGuide(false)} className="text-muted hover:text-foreground text-xl">✕</button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold mb-1">1. 버전 선택</p>
                <p className="text-xs text-muted">상단 탭에서 PHOTOBOOK / ID PASS / INVENTORY / POCAALBUM 버전을 선택하면 해당 버전을 취급하는 판매처만 표시됩니다.</p>
              </div>
              <div>
                <p className="font-semibold mb-1">2. 위시리스트 담기</p>
                <p className="text-xs text-muted">판매처 왼쪽 체크박스를 누르면 위시리스트에 담깁니다. 수량 조절과 가격 확인이 가능합니다.</p>
              </div>
              <div>
                <p className="font-semibold mb-1">3. 구매 체크</p>
                <p className="text-xs text-muted">위시리스트에서 "구매체크" 버튼을 누르면 수량, 할인, 추가금액을 입력하고 구매 내역으로 기록할 수 있습니다. 구매 내역을 클릭하면 수정도 가능합니다.</p>
              </div>
              <div>
                <p className="font-semibold mb-1">4. 미공포 확인</p>
                <p className="text-xs text-muted">🃏 미공포 버튼을 누르면 전체 미공포 포토카드를 한눈에 볼 수 있습니다. 구매/위시 상태도 표시됩니다.</p>
              </div>
              <div>
                <p className="font-semibold mb-1">5. 기기 간 동기화</p>
                <p className="text-xs text-muted">🔄 동기화 버튼에서 코드를 생성하면, 다른 기기에서 같은 코드로 데이터를 공유할 수 있습니다. 데이터는 자동 저장됩니다.</p>
              </div>
              <div>
                <p className="font-semibold mb-1">6. 드볼 진행도</p>
                <p className="text-xs text-muted">구매내역 아래에서 버전별 드볼 진행 현황을 확인할 수 있습니다. 위시리스트 + 구매내역이 모두 합산됩니다.</p>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-[11px] text-muted">데이터는 브라우저에 저장되며, 동기화 코드 연결 시 서버에도 백업됩니다. 문의는 @ari4plv로 부탁드립니다.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar modal */}
      {showCalendar && (
        <div className="fixed top-0 left-0 w-screen h-screen z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCalendar(false)}>
          <div className="bg-card rounded-xl border border-border p-5 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">📅 일정 캘린더</h2>
              <button onClick={() => setShowCalendar(false)} className="text-muted hover:text-foreground text-lg">✕</button>
            </div>
            <div className="space-y-2">
              {(() => {
                const now = new Date();
                const events: { date: string; label: string; color: string; past: boolean }[] = [];
                RETAILERS.forEach((r) => {
                  const deadlineStr = r.deadline || r.salePeriods?.find((sp) => sp.type === "online")?.end;
                  if (deadlineStr) {
                    const d = new Date(deadlineStr.replace(" ", "T"));
                    events.push({ date: deadlineStr.split(" ")[0], label: `${r.name} 마감`, color: d < now ? "var(--muted)" : "var(--exclusive)", past: d < now });
                  }
                  r.salePeriods?.filter((sp) => sp.type === "offline").forEach((sp) => {
                    events.push({ date: sp.start.split(" ")[0], label: `${r.name} 오프라인`, color: "var(--accent)", past: new Date(sp.end.replace(" ", "T")) < now });
                  });
                });
                events.sort((a, b) => a.date.localeCompare(b.date));
                const grouped = events.reduce<Record<string, typeof events>>((acc, e) => {
                  (acc[e.date] = acc[e.date] || []).push(e);
                  return acc;
                }, {});
                return Object.entries(grouped).map(([date, items]) => (
                  <div key={date} className={`flex gap-3 text-sm py-1.5 ${items[0].past ? "opacity-40" : ""}`}>
                    <span className="w-14 flex-shrink-0 text-muted font-mono text-xs pt-0.5">{date.slice(5)}</span>
                    <div className="flex-1 space-y-1">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-xs">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Update toast */}
      {!updateDismissed && (
        <div className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto z-50 animate-slide-down">
          <div className="flex items-center gap-3 text-xs bg-card border border-accent/30 rounded-xl shadow-lg px-4 py-3">
            <span className="text-accent text-base">🆕</span>
            <span className="flex-1">{LATEST_UPDATE.message}</span>
            <button onClick={() => { localStorage.setItem("plave-update-dismissed", LATEST_UPDATE.date); setUpdateDismissed(true); }} className="text-muted hover:text-foreground text-sm">✕</button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed top-0 left-0 w-screen h-screen z-[60] bg-black/70 flex items-center justify-center cursor-pointer"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt=""
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
