"use client";

import { useSyncExternalStore } from "react";
import { EXAMPLES, isProductType, type ProductType, type SavedOption, type Values } from "./finance";
import { DEFAULT_SITUATION, type Situation } from "./journey";
import { EMPTY_CAR, type CarState } from "./sim";

// Everything here lives in this browser's localStorage only, under keys that start with "bys:", as plain JSON until
// cleared. That includes the Plan answers (with credit answers) and, when a document was used in Plan or Read the
// small print, the short quotes behind each term. Nothing here is sent to a server. clearSaved() removes all of it.

const PREFIX = "bys:";
/** Every store's reset, so clearSaved() can empty the in-memory caches as well as localStorage. */
const resets: (() => void)[] = [];

export interface Draft { type: ProductType; values: Values; example: boolean }

export const DEFAULT_DRAFT: Draft = { type: EXAMPLES[1].type, values: { ...EXAMPLES[1].values }, example: true };

function createStore<T>(key: string, fallback: T, validate: (x: unknown) => x is T) {
  let cache: T | undefined;
  const listeners = new Set<() => void>();
  // Another tab changed or cleared this key (for example "Clear everything saved on this device"): drop the cached
  // copy and re-read, so this tab doesn't write its stale answers back on the next edit.
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.storageArea !== localStorage || (e.key !== null && e.key !== key)) return;
      cache = undefined;
      listeners.forEach((l) => l());
    });
  }
  const get = (): T => {
    if (cache !== undefined) return cache;
    try {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : undefined;
      cache = validate(parsed) ? parsed : fallback;
    } catch {
      cache = fallback;
    }
    return cache;
  };
  const set = (next: T) => {
    cache = next;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable: keep in memory */ }
    listeners.forEach((l) => l());
  };
  /** Back to the fallback: removes the saved value and tells every open view, so nothing stale comes back. */
  const reset = () => {
    cache = fallback;
    try { localStorage.removeItem(key); } catch { /* storage unavailable: nothing saved to remove */ }
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
  const use = () => useSyncExternalStore(subscribe, get, () => fallback);
  resets.push(reset);
  return { get, set, use, reset };
}

const isValues = (v: unknown): v is Values => !!v && typeof v === "object" && !Array.isArray(v);
const isOption = (o: unknown): o is SavedOption => {
  const x = o as SavedOption;
  return !!x && typeof x.id === "string" && typeof x.name === "string" && isProductType(x.type) && isValues(x.values);
};

export const savedStore = createStore<SavedOption[]>("bys:saved", EXAMPLES, (x): x is SavedOption[] => Array.isArray(x) && x.every(isOption));
export const draftStore = createStore<Draft>("bys:draft", DEFAULT_DRAFT, (x): x is Draft => {
  const d = x as Draft;
  return !!d && isProductType(d.type) && isValues(d.values);
});

export const MAX_SAVED = 4;

export const newOptionId = () => `o${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Things the person already pays for, for the commitment map. Browser-only, like everything here. */
export const commitmentsStore = createStore<SavedOption[]>("bys:commitments", [], (x): x is SavedOption[] => Array.isArray(x) && x.every(isOption));
export const MAX_COMMITMENTS = 12;

/** This month as "YYYY-MM". Payment dates are counted from here (most first payments land a month later). */
export function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** The guided journey's answers, so a refresh doesn't lose them. Browser-only. */
export const journeyStore = createStore<Situation>("bys:journey", DEFAULT_SITUATION, (x): x is Situation => {
  const s = x as Situation;
  return !!s && typeof s === "object" && typeof s.goal === "string" && typeof s.price === "number" && typeof s.housing === "number" && Array.isArray(s.changes) && !!s.invest;
});

/** The car decision journey. Browser-only. */
export const carStore = createStore<CarState>("bys:car4", EMPTY_CAR, (x): x is CarState => {
  const s = x as CarState;
  return !!s && typeof s === "object" && !!s.purchase && !!s.picture && Array.isArray(s.picture.income) && Array.isArray(s.events) && !!s.credit && Array.isArray(s.credit.scores) && !!s.finance;
});

/** A decision someone chose to remember on this device, so they can compare "last time" with "now". Browser-only. */
export interface SavedDecision { savedAt: string; price: number; deposit: number; monthly: number; remainingBefore: number; remainingAfter: number; buffer: number; apr: number; term: number }
export const decisionStore = createStore<SavedDecision[]>("bys:decisions", [], (x): x is SavedDecision[] =>
  Array.isArray(x) && x.every((d) => !!d && typeof (d as SavedDecision).savedAt === "string" && typeof (d as SavedDecision).monthly === "number"));

/**
 * Removes everything Before You Sign saved on this device: every "bys:" key (including ones from older versions,
 * such as "bys:car") and every store's in-memory copy, then tells open views. Returns how many keys were removed.
 */
export function clearSaved(): number {
  let removed = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    removed = keys.length;
  } catch { /* storage unavailable: only the in-memory copies exist */ }
  resets.forEach((reset) => reset());
  return removed;
}
