"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Heart, CheckCircle2 } from "lucide-react";
import { RETAILERS, Currency } from "@/data/retailers";
import { AlbumVersion } from "@/data/albums";
import { getPurchases, Purchase } from "@/lib/purchases";
import { initAnalytics, trackEvent } from "@/lib/analytics";
import VersionBadge from "@/components/VersionBadge";

interface CartItem {
  retailerId: string;
  version: AlbumVersion;
  saleType: "set" | "random" | "single";
  quantity: number;
  unitPrice: number;
  currency: Currency;
}

export default function BenefitsPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [modalKey, setModalKey] = useState<string | null>(null);

  useEffect(() => {
    initAnalytics();
    trackEvent("view_benefits_page");
    setPurchases(getPurchases());
    const storedCart = localStorage.getItem("plave-caligo-cart");
    if (storedCart) {
      try {
        const parsed: CartItem[] = JSON.parse(storedCart);
        setCart(parsed.filter((c) => RETAILERS.some((r) => r.id === c.retailerId)));
      } catch { /* ignore */ }
    }
  }, []);

  const allExclusiveBenefits = useMemo(() => {
    const all = RETAILERS.flatMap((r) =>
      r.benefits
        .filter((b) => b.isExclusive)
        .map((b) => ({ retailerId: r.id, retailerName: r.name, benefit: b, retailers: [{ id: r.id, name: r.name }] }))
    );
    const imageMap = new Map<string, typeof all[0]>();
    return all.filter((item) => {
      if (item.benefit.image) {
        const existing = imageMap.get(item.benefit.image);
        if (existing) {
          existing.retailers.push({ id: item.retailerId, name: item.retailerName });
          existing.retailerName = existing.retailers.map((r) => r.name).join(" / ");
          return false;
        }
        imageMap.set(item.benefit.image, item);
      }
      return true;
    });
  }, []);

  // Close modal on Esc
  useEffect(() => {
    if (!modalKey) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModalKey(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalKey]);

  const modalItem = modalKey
    ? allExclusiveBenefits.find(({ retailerId, benefit }) => `${retailerId}-${benefit.name}` === modalKey)
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">미공포 전체 보기</h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{allExclusiveBenefits.length}종</span>
            <span className="inline-flex items-center gap-1">
              · <Heart size={12} className="fill-purple-500 text-purple-500" /> 위시리스트
            </span>
            <span className="inline-flex items-center gap-1">
              · <CheckCircle2 size={18} strokeWidth={2.5} className="fill-green-500 text-white" /> 구매완료
            </span>
          </p>
        </div>
        <Link
          href="/"
          className="text-xs px-3 py-1.5 rounded border border-border text-muted hover:text-foreground hover:border-muted transition-colors"
        >
          ← 판매처 목록
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {allExclusiveBenefits.map(({ retailerId, retailerName, benefit, retailers: benefitRetailers }) => {
          const retailerIds = benefitRetailers.map((r) => r.id);
          const purchaseCount = purchases
            .filter((p) => retailerIds.includes(p.retailerId))
            .reduce((sum, p) => sum + (p.saleType === "set" ? 5 * p.quantity : p.quantity), 0);
          const cartCount = cart
            .filter((c) => retailerIds.includes(c.retailerId))
            .reduce((sum, c) => sum + (c.saleType === "set" ? 5 * c.quantity : c.quantity), 0);
          const isPurchased = purchaseCount > 0;
          const isInCart = cartCount > 0;
          const benefitKey = `${retailerId}-${benefit.name}`;
          const retailer = RETAILERS.find((r) => r.id === retailerId);
          const deadlineStr = retailer?.deadline || retailer?.salePeriods?.find((sp) => sp.type === "online")?.end;
          // 마감된 판매처는 날짜 숨김
          const deadlineDate = deadlineStr ? new Date(deadlineStr.replace(" ", "T")) : null;
          const isClosed = deadlineDate ? deadlineDate < new Date() : false;
          const showDeadline = deadlineStr && !isClosed;
          return (
            <div
              key={benefitKey}
              className="rounded-xl border border-border overflow-hidden cursor-pointer bg-card transition-transform hover:scale-[1.02]"
              onClick={() => {
                setModalKey(benefitKey);
                trackEvent("benefit_detail", { retailer: retailerName });
              }}
            >
              {/* Cover image */}
              <div className="relative aspect-10/3 bg-background">
                {benefit.image ? (
                  <img
                    src={benefit.image}
                    alt={benefit.name}
                    className={`w-full h-full object-cover ${isPurchased ? "brightness-75" : ""}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted">
                    미공개
                  </div>
                )}
              </div>
              {/* Content — clean text on card background */}
              <div className="p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-xs sm:text-sm truncate leading-tight flex-1 min-w-0">{retailerName}</h3>
                  {isPurchased && (
                    <CheckCircle2 size={24} strokeWidth={2.5} className="fill-green-500 text-white shrink-0" aria-label="구매완료" />
                  )}
                  {isInCart && !isPurchased && (
                    <Heart size={14} className="fill-purple-500 text-purple-500 shrink-0" aria-label="위시리스트" />
                  )}
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {benefit.versions ? (
                    benefit.versions.map((v) => <VersionBadge key={v} version={v} />)
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-border text-muted">ALL</span>
                  )}
                  {showDeadline && (
                    <span className="text-[10px] text-muted">~{deadlineStr.split(" ")[0].slice(5)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      {modalItem && (() => {
        const { retailerId, retailerName, benefit, retailers: benefitRetailers } = modalItem;
        const retailerIds = benefitRetailers.map((r) => r.id);
        const purchaseCount = purchases
          .filter((p) => retailerIds.includes(p.retailerId))
          .reduce((sum, p) => sum + (p.saleType === "set" ? 5 * p.quantity : p.quantity), 0);
        const cartCount = cart
          .filter((c) => retailerIds.includes(c.retailerId))
          .reduce((sum, c) => sum + (c.saleType === "set" ? 5 * c.quantity : c.quantity), 0);
        const isPurchased = purchaseCount > 0;
        const isInCart = cartCount > 0;
        const retailer = RETAILERS.find((r) => r.id === retailerId);
        const deadlineStr = retailer?.deadline || retailer?.salePeriods?.find((sp) => sp.type === "online")?.end;
        const deadlineDate = deadlineStr ? new Date(deadlineStr.replace(" ", "T")) : null;
        const isClosed = deadlineDate ? deadlineDate < new Date() : false;
        const showDeadline = deadlineStr && !isClosed;
        return (
          <div
            className="fixed top-0 left-0 w-screen h-screen z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4"
            onClick={() => setModalKey(null)}
          >
            <div
              className="bg-card rounded-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <div className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="font-bold text-base truncate pr-2">{retailerName}</h3>
                <button
                  onClick={() => setModalKey(null)}
                  className="text-muted hover:text-foreground text-xl shrink-0"
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>
              {/* Full image */}
              {benefit.image ? (
                <img src={benefit.image} alt={benefit.name} className="w-full object-contain bg-background" />
              ) : (
                <div className="w-full h-40 bg-border flex items-center justify-center text-sm text-muted">미공개</div>
              )}
              {/* Details */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {benefit.versions ? (
                    benefit.versions.map((v) => <VersionBadge key={v} version={v} />)
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-border text-muted">ALL</span>
                  )}
                  {showDeadline && <span className="text-[10px] text-muted">~{deadlineStr.split(" ")[0].slice(5)}</span>}
                  {isClosed && <span className="text-[10px] text-muted">마감됨</span>}
                  {isPurchased && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600">
                      <CheckCircle2 size={10} className="fill-green-500 text-white" /> 구매완료
                    </span>
                  )}
                  {isInCart && !isPurchased && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600">
                      <Heart size={10} className="fill-purple-500 text-purple-500" /> 위시리스트
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--exclusive)" }}>{benefit.name}</p>
                  <p className="text-xs text-muted leading-relaxed mt-1">{benefit.description}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
