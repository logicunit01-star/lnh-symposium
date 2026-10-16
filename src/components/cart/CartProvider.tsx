"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = { id: string; title: string; kind: "WORKSHOP" | "SESSION"; fee: number; when: string; tag?: string | null };
type Ctx = {
  items: CartItem[]; count: number; total: number; open: boolean; ready: boolean;
  has: (id: string) => boolean; add: (i: CartItem) => void; remove: (id: string) => void; toggle: (i: CartItem) => void;
  clear: () => void; setOpen: (o: boolean) => void;
};
const CartCtx = createContext<Ctx | null>(null);
const KEY = "lnh_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setItems(JSON.parse(raw)); } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {} }, [items, ready]);
  const has = useCallback((id: string) => items.some((x) => x.id === id), [items]);
  const add = useCallback((i: CartItem) => setItems((p) => (p.some((x) => x.id === i.id) ? p : [...p, i])), []);
  const remove = useCallback((id: string) => setItems((p) => p.filter((x) => x.id !== id)), []);
  const toggle = useCallback((i: CartItem) => setItems((p) => (p.some((x) => x.id === i.id) ? p.filter((x) => x.id !== i.id) : [...p, i])), []);
  const clear = useCallback(() => setItems([]), []);
  const value = useMemo<Ctx>(() => ({
    items, count: items.length, total: items.reduce((a, b) => a + b.fee, 0), open, ready, has, add, remove, toggle, clear, setOpen,
  }), [items, open, ready, has, add, remove, toggle, clear]);
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
