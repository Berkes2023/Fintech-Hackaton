"use client";

import { useSyncExternalStore } from "react";
import { EXAMPLES, isProductType, type ProductType, type SavedOption, type Values } from "./finance";

// Everything here lives in this browser's localStorage only. Nothing is sent to a server.

export interface Draft { type: ProductType; values: Values; example: boolean }

export const DEFAULT_DRAFT: Draft = { type: EXAMPLES[1].type, values: { ...EXAMPLES[1].values }, example: true };

function createStore<T>(key: string, fallback: T, validate: (x: unknown) => x is T) {
  let cache: T | undefined;
  const listeners = new Set<() => void>();
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
  const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
  const use = () => useSyncExternalStore(subscribe, get, () => fallback);
  return { get, set, use };
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
