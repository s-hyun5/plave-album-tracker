"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ALBUM_SPECS, COLLECTION_REQUIREMENTS, AlbumVersion } from "@/data/albums";
import { RETAILERS, Retailer, formatPrice, getShippingFee, getShippingDisplay, Currency } from "@/data/retailers";
import { Purchase, getPurchases, savePurchase, deletePurchase, isPurchased, isBenefitOwned, setBenefitOwned } from "@/lib/purchases";
import VersionBadge from "@/components/VersionBadge";

const VERSIONS: AlbumVersion[] = ["PHOTOBOOK", "ID_PASS", "INVENTORY", "POCAALBUM"];

// 환율 (KRW 기준, 2026.03.25)
const EXCHANGE_RATES: Record<Currency, number> = {
  KRW: 1,
  JPY: 9.6,
  USD: 1450,
  TWD: 44,
  CNY: 200,
};

function toKRW(price: number, currency: Currency): number {
  return Math.round(price * EXCHANGE_RATES[currency]);
}

function formatKRWWithOriginal(price: number, currency: Currency): string {
  if (currency === "KRW") return formatPrice(price, "KRW");
  const krw = toKRW(price, currency);
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

  // Load from localStorage
  useEffect(() => {
    setPurchases(getPurchases());
    // Load benefit ownership
    const stored = localStorage.getItem("plave-caligo-benefits");
    if (stored) setBenefitState(JSON.parse(stored));
  }, []);

  const reloadPurchases = useCallback(() => setPurchases(getPurchases()), []);

  // All exclusive benefits across all retailers
  const allExclusiveBenefits = useMemo(() => {
    return RETAILERS.flatMap((r) =>
      r.benefits
        .filter((b) => b.isExclusive)
        .map((b) => ({ retailerId: r.id, retailerName: r.name, benefit: b }))
    );
  }, []);

  // Retailers filtered by version, sorted: exclusive first, then price asc
  const retailers = useMemo(() => {
    return RETAILERS.filter((r) =>
      r.products.some((p) => p.version === activeTab)
    ).sort((a, b) => {
      const aExcl = a.benefits.some((b) => b.isExclusive && (!b.versions || b.versions.includes(activeTab)));
      const bExcl = b.benefits.some((b) => b.isExclusive && (!b.versions || b.versions.includes(activeTab)));
      if (aExcl && !bExcl) return -1;
      if (!aExcl && bExcl) return 1;
      const getPriceForSort = (r: Retailer) => {
        const sp = getSetPrice(r, activeTab);
        if (!sp) return Infinity;
        const priceKRW = toKRW(sp.price, sp.currency);
        const shipping = getShippingFee(r, sp.price);
        return priceKRW + (shipping !== null ? toKRW(shipping, r.currency) : 0);
      };
      return getPriceForSort(a) - getPriceForSort(b);
    });
  }, [activeTab]);

  // Cart helpers
  const isInCart = (retailerId: string) => cart.some((c) => c.retailerId === retailerId && c.version === activeTab);

  const toggleCart = useCallback((retailer: Retailer) => {
    setCart((prev) => {
      const exists = prev.find((c) => c.retailerId === retailer.id && c.version === activeTab);
      if (exists) return prev.filter((c) => !(c.retailerId === retailer.id && c.version === activeTab));
      const sp = getSetPrice(retailer, activeTab);
      if (!sp) return prev;
      // 세트 상품이 있으면 세트, 없으면 개별(포토북) 또는 개별×5용 랜덤
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
    .filter((c) => c.currency === "KRW")
    .reduce((s, c) => s + c.itemTotal + (c.shipping ?? 0), 0);

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
  }, [benefitState]);

  const isBenefitChecked = (retailerId: string, benefitName: string) => benefitState[`${retailerId}::${benefitName}`] ?? false;
  const isPurchasedCheck = (retailerId: string) => purchases.some((p) => p.retailerId === retailerId && p.version === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">앨범 판매처</h1>
          <p className="text-sm text-muted mt-0.5">체크박스로 장바구니 담기 · 카드 클릭으로 상세 보기</p>
        </div>
        <a
          href="https://docs.google.com/spreadsheets/d/1ZoCg8ovvls40kOYZfQqgT7Jk9vuUyP6FSabl7G4Au0U/edit?gid=0#gid=0"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded border border-border text-muted hover:text-foreground hover:border-muted transition-colors"
        >
          음총팀 예판 정리본
        </a>
      </div>

      {/* Version tabs */}
      <div className="flex gap-2">
        {VERSIONS.map((v) => {
          const spec = ALBUM_SPECS.find((a) => a.version === v)!;
          const count = RETAILERS.filter((r) => r.products.some((p) => p.version === v)).length;
          return (
            <button
              key={v}
              onClick={() => setActiveTab(v)}
              className={`flex-1 rounded-lg p-3 border text-left transition-all ${
                activeTab === v ? "shadow-sm" : "border-border hover:border-muted bg-card"
              }`}
              style={activeTab === v ? { borderColor: spec.color, backgroundColor: spec.colorBg } : {}}
            >
              <span className="text-xs font-semibold" style={{ color: spec.color }}>{spec.label}</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-bold">{spec.priceSet ? `${spec.priceSet.toLocaleString()}원` : `${spec.priceRandom.toLocaleString()}원`}</span>
                <span className="text-xs text-muted">{spec.priceSet ? "세트" : "개별"}</span>
              </div>
              <span className="text-xs text-muted">{count}곳</span>
            </button>
          );
        })}
      </div>

      {/* Main: list + panel */}
      <div className="flex gap-6">
        {/* Left: retailer list */}
        <div className="flex-1 min-w-0 space-y-2">
          {retailers.map((r) => {
            const products = r.products.filter((p) => p.version === activeTab);
            const sp = getSetPrice(r, activeTab);
            const exclusives = r.benefits.filter((b) => b.isExclusive && (!b.versions || b.versions.includes(activeTab)));
            const hasExclusive = exclusives.length > 0;
            const inCart = isInCart(r.id);
            const isExpanded = expandedRetailer === r.id;
            const purchased = isPurchasedCheck(r.id);
            const displayPrice = sp?.price ?? 0;
            const displayCurrency = sp?.currency ?? "KRW";
            const shipping = sp ? getShippingFee(r, displayPrice) : null;
            const totalWithShipping = shipping !== null && shipping > 0 ? displayPrice + shipping : null;

            return (
              <div key={r.id} className={`rounded-lg border overflow-hidden transition-colors ${
                purchased ? "border-border bg-card opacity-50" : inCart ? "border-accent bg-accent-light" : "border-border bg-card"
              }`}>
                {/* Main row */}
                <div className="flex items-center gap-3 px-4 py-3">
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
                    onClick={() => setExpandedRetailer(isExpanded ? null : r.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{r.name}</span>
                      {r.type === "group_purchase" && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-border text-muted">공구</span>
                      )}
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
                      const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
                    onClick={() => setExpandedRetailer(isExpanded ? null : r.id)}
                  >
                    <div className="font-semibold text-sm">
                      {displayCurrency !== "KRW"
                        ? formatKRWWithOriginal(totalWithShipping ?? displayPrice, displayCurrency)
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
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 bg-card-hover space-y-4 text-sm">
                    {/* Prices */}
                    <div>
                      <p className="text-xs text-muted font-medium mb-2">가격</p>
                      <div className="grid grid-cols-2 gap-2">
                        {products.map((p, i) => {
                          const s = getShippingFee(r, p.price);
                          return (
                            <div key={i} className="flex justify-between text-xs bg-background rounded px-2 py-1.5">
                              <span className="text-muted">{p.saleType === "set" ? "세트 (5종)" : p.saleType === "random" ? "랜덤 (1종)" : "개별"}</span>
                              <span>
                                {p.currency !== "KRW" ? formatKRWWithOriginal(p.price, p.currency) : formatPrice(p.price, "KRW")}
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
                                className="w-28 h-28 rounded-md object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); setLightboxImg(b.image!); }}
                              />
                            ) : (
                              <div className="w-28 h-28 rounded-md bg-border flex items-center justify-center text-xs text-muted flex-shrink-0">
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
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
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
                            className="text-xs px-3 py-1.5 rounded bg-accent text-white hover:opacity-90 transition-opacity"
                          >
                            구매하러 가기 →
                          </a>
                        );
                      })()}
                      {inCart && !purchased && (
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

        {/* Right: panels */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-16 space-y-4">
            {/* Cart */}
            <div className="bg-card rounded-lg border border-border p-4">
              <h2 className="font-semibold text-sm mb-3">장바구니</h2>
              {cart.length === 0 ? (
                <p className="text-xs text-muted py-3 text-center">체크박스를 눌러 담아보세요</p>
              ) : (
                <>
                  <div className="space-y-3 mb-3">
                    {cartItemsWithShipping.map((item) => {
                      const retailer = RETAILERS.find((r) => r.id === item.retailerId);
                      if (!retailer) return null;
                      const products = retailer.products.filter((p) => p.version === item.version);
                      const hasSet = products.some((p) => p.saleType === "set");
                      const hasRandom = products.some((p) => p.saleType === "random" || p.saleType === "single");

                      return (
                        <div key={`${item.retailerId}-${item.version}`} className="border-b border-border pb-2 last:border-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <VersionBadge version={item.version} />
                              <span className="text-xs truncate">{retailer.name}</span>
                            </div>
                            <button
                              onClick={() => removeCartItem(item.retailerId, item.version)}
                              className="text-muted hover:text-foreground text-sm px-1"
                            >×</button>
                          </div>
                          {/* Sale type + quantity */}
                          <div className="flex items-center gap-2">
                            {(hasSet && hasRandom) && (
                              <select
                                value={item.saleType}
                                onChange={(e) => {
                                  const newType = e.target.value as "set" | "random" | "single";
                                  const p = products.find((p) => p.saleType === newType) || products.find((p) => p.saleType === "single");
                                  if (p) updateCartItem(item.retailerId, item.version, { saleType: newType, unitPrice: p.price });
                                }}
                                className="text-xs bg-background border border-border rounded px-1.5 py-1"
                              >
                                {hasSet && <option value="set">세트</option>}
                                {hasRandom && <option value={products.find((p) => p.saleType === "random") ? "random" : "single"}>개별</option>}
                              </select>
                            )}
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
                            <span className="text-xs ml-auto font-medium">
                              {formatPrice(item.itemTotal + (item.shipping ?? 0), item.currency)}
                            </span>
                          </div>
                          {item.shipping !== null && item.shipping > 0 && (
                            <p className="text-xs text-muted mt-0.5">배송비 {formatPrice(item.shipping, "KRW")} 포함</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between items-center">
                    <span className="text-sm font-medium">합계 (KRW)</span>
                    <span className="text-lg font-bold text-accent">{cartTotalKRW.toLocaleString()}원</span>
                  </div>
                </>
              )}
            </div>

            {/* 미공포 현황 — 압축 그리드 */}
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm">미공포 현황</h2>
                <span className="text-xs text-muted">
                  {allExclusiveBenefits.filter(({ retailerId }) => purchases.some((p) => p.retailerId === retailerId) || cart.some((c) => c.retailerId === retailerId)).length}
                  /{allExclusiveBenefits.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {allExclusiveBenefits.map(({ retailerId, retailerName, benefit }) => {
                  const purchaseCount = purchases.filter((p) => p.retailerId === retailerId).reduce((sum, p) => sum + (p.saleType === "set" ? 5 * p.quantity : p.quantity), 0);
                  const cartCount = cart.filter((c) => c.retailerId === retailerId).reduce((sum, c) => sum + (c.saleType === "set" ? 5 * c.quantity : c.quantity), 0);
                  const totalCount = purchaseCount + cartCount;
                  const isPurchased = purchaseCount > 0;
                  const isInCart = cartCount > 0;

                  return (
                    <div
                      key={`${retailerId}-${benefit.name}`}
                      className={`relative flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-all ${
                        totalCount > 0 ? "" : "opacity-35"
                      }`}
                      style={isInCart && !isPurchased ? { backgroundColor: "var(--exclusive-bg)" } : undefined}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                        isPurchased ? "bg-accent border-accent text-white" : "border-border"
                      }`}>
                        {isPurchased && <span style={{ fontSize: 9 }}>✓</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate leading-tight">{retailerName}</p>
                      </div>
                      {totalCount > 0 && (
                        <span className="text-xs flex-shrink-0 leading-none" style={{ color: isPurchased ? "var(--accent)" : "var(--exclusive)", fontSize: 10 }}>
                          {totalCount}장
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 드볼 진행도 */}
            <div className="bg-card rounded-lg border border-border p-4">
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

            {/* 구매 내역 */}
            {purchases.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-4">
                <h2 className="font-semibold text-sm mb-3">구매 내역</h2>
                <div className="space-y-2">
                  {purchases.map((p) => {
                    const retailer = RETAILERS.find((r) => r.id === p.retailerId);
                    return (
                      <div key={p.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <VersionBadge version={p.version} />
                          <span className="text-xs truncate">{retailer?.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-medium">{formatPrice(p.totalPrice, p.currency)}</span>
                          <button onClick={() => handleDeletePurchase(p.id)} className="text-xs text-muted hover:text-foreground">×</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-border pt-2 mt-2 text-xs text-muted">
                  총 {formatPrice(purchases.filter((p) => p.currency === "KRW").reduce((s, p) => s + p.totalPrice, 0), "KRW")} 지출
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center cursor-pointer"
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
