import { supabase } from "./supabase";

const SYNC_CODE_KEY = "plave-caligo-sync-code";
const SYNC_KEYS = ["plave-caligo-purchases", "plave-caligo-benefits", "plave-caligo-cart"];

export function getSyncCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SYNC_CODE_KEY);
}

export function setSyncCode(code: string): void {
  localStorage.setItem(SYNC_CODE_KEY, code);
}

export function clearSyncCode(): void {
  localStorage.removeItem(SYNC_CODE_KEY);
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0/O/1/I 제외
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getAllData(): Record<string, string> {
  const data: Record<string, string> = {};
  for (const key of SYNC_KEYS) {
    const val = localStorage.getItem(key);
    if (val) data[key] = val;
  }
  return data;
}

function applyData(data: Record<string, string>): void {
  for (const key of SYNC_KEYS) {
    if (data[key]) {
      localStorage.setItem(key, data[key]);
    }
  }
}

// 새 동기화 코드 생성 + 현재 데이터 업로드
export async function createSync(): Promise<{ code: string; error?: string }> {
  const code = generateCode();
  const data = getAllData();

  const { error } = await supabase.from("sync_data").upsert({
    code,
    data,
    updated_at: new Date().toISOString(),
  });

  if (error) return { code: "", error: error.message };

  setSyncCode(code);
  return { code };
}

// 기존 코드로 연결 + 서버 데이터 다운로드
export async function connectSync(code: string): Promise<{ success: boolean; error?: string }> {
  const upperCode = code.toUpperCase().trim();

  const { data, error } = await supabase
    .from("sync_data")
    .select("data")
    .eq("code", upperCode)
    .single();

  if (error || !data) return { success: false, error: "코드를 찾을 수 없습니다" };

  applyData(data.data);
  setSyncCode(upperCode);
  return { success: true };
}

// 현재 데이터를 서버에 업로드
export async function pushSync(): Promise<{ success: boolean; error?: string }> {
  const code = getSyncCode();
  if (!code) return { success: false, error: "동기화 코드 없음" };

  const data = getAllData();

  const { error } = await supabase.from("sync_data").upsert({
    code,
    data,
    updated_at: new Date().toISOString(),
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// 자동 push (debounced) — 데이터 변경 시 호출
let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function autoPush(): void {
  const code = getSyncCode();
  if (!code) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    const r = await pushSync();
    if (r.success) localStorage.setItem("plave-caligo-last-saved", new Date().toISOString());
  }, 1000);
}

// 자동 pull — 페이지 로드 시 호출
export async function autoPull(): Promise<boolean> {
  const code = getSyncCode();
  if (!code) return false;
  const result = await pullSync();
  return result.success;
}

// 서버에서 데이터 다운로드
export async function pullSync(): Promise<{ success: boolean; error?: string }> {
  const code = getSyncCode();
  if (!code) return { success: false, error: "동기화 코드 없음" };

  const { data, error } = await supabase
    .from("sync_data")
    .select("data")
    .eq("code", code)
    .single();

  if (error || !data) return { success: false, error: "데이터를 찾을 수 없습니다" };

  applyData(data.data);
  return { success: true };
}
