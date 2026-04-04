import { AlbumVersion } from "@/data/albums";
import { Currency } from "@/data/retailers";

// ─── 구매 기록 ───
export interface Adjustment {
  type: "discount" | "extra";
  amount: number;
  currency: Currency;
  amountKRW: number;
  note: string;
}

export interface Purchase {
  id: string;
  retailerId: string;
  version: AlbumVersion;
  saleType: "random" | "set" | "single";
  quantity: number;
  totalPrice: number;
  discount: number;
  extra: number;
  adjustments?: Adjustment[];
  currency: Currency;
  purchaseDate: string;
  notes: string;
}

const PURCHASES_KEY = "plave-caligo-purchases";

export function getPurchases(): Purchase[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(PURCHASES_KEY);
  return data ? JSON.parse(data) : [];
}

export function savePurchase(purchase: Purchase): void {
  const purchases = getPurchases();
  const idx = purchases.findIndex((p) => p.id === purchase.id);
  if (idx >= 0) purchases[idx] = purchase;
  else purchases.push(purchase);
  localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
}

export function deletePurchase(id: string): void {
  const purchases = getPurchases().filter((p) => p.id !== id);
  localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
}

export function isPurchased(retailerId: string, version: AlbumVersion): boolean {
  return getPurchases().some((p) => p.retailerId === retailerId && p.version === version);
}

// ─── 미공포 수집 현황 ───
const BENEFITS_KEY = "plave-caligo-benefits";

type BenefitOwnership = Record<string, boolean>; // `${retailerId}::${benefitName}` → boolean

function getBenefitOwnership(): BenefitOwnership {
  if (typeof window === "undefined") return {};
  const data = localStorage.getItem(BENEFITS_KEY);
  return data ? JSON.parse(data) : {};
}

export function isBenefitOwned(retailerId: string, benefitName: string): boolean {
  return getBenefitOwnership()[`${retailerId}::${benefitName}`] ?? false;
}

export function setBenefitOwned(retailerId: string, benefitName: string, owned: boolean): void {
  const data = getBenefitOwnership();
  data[`${retailerId}::${benefitName}`] = owned;
  localStorage.setItem(BENEFITS_KEY, JSON.stringify(data));
}
