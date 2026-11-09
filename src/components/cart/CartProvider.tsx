"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Order being built by the delegate (registration redesign, release 1):
 * - at most one Symposium Pass (all symposium sessions, one banquet pass included, 0 to 2 extra banquet passes)
 * - any number of workshop tickets (separate products, D1)
 * Scientific and plenary sessions are never items: the pass covers them.
 */
export type CartItem = { id: string; title: string; kind: "WORKSHOP"; fee: number; when: string; tag?: string | null };
export type PassSel = { categoryId: number; tier: string; designation: string; fee: number; early: boolean; extraBanquet: number; banquetFee: number };
export type HeldPass = { regNo: string; status: string; accessToken: string; designation: string | null; categoryId: number } | null;

type Ctx = {
  items: CartItem[]; pass: PassSel | null; held: HeldPass; procPct: number;
  count: number; total: number; open: boolean; ready: boolean;
  has: (id: string) => boolean; add: (i: CartItem) => void; remove: (id: string) => void; toggle: (i: CartItem) => void;
  setPass: (p: PassSel | null) => void; setExtraBanquet: (n: number) => void;
  clear: () => void; setOpen: (o: boolean) => void;
};
const CartCtx = createContext<Ctx | null>(null);
const KEY = "lnh_order_v2";

export function CartProvider({ children, held = null, procPct = 0 }: { children: React.ReactNode; held?: HeldPass; procPct?: number }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [pass, setPassState] = useState<PassSel | null>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const v = JSON.parse(raw); setItems((v.items ?? []).filter((x: CartItem) => x.kind === "WORKSHOP")); setPassState(v.pass ?? null); }
      else {
        // carry workshop tickets over from the old cart; sessions are covered by the pass now
        const old = localStorage.getItem("lnh_cart_v1");
        if (old) { setItems(JSON.parse(old).filter((x: CartItem) => x.kind === "WORKSHOP")); localStorage.removeItem("lnh_cart_v1"); }
      }
    } catch {}
    setReady(true);
  }, []);
  // A delegate who already holds a pass cannot buy a second one
  const effPass = held ? null : pass;
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify({ items, pass: effPass })); } catch {} }, [items, effPass, ready]);
  const has = useCallback((id: string) => items.some((x) => x.id === id), [items]);
  const add = useCallback((i: CartItem) => setItems((p) => (p.some((x) => x.id === i.id) ? p : [...p, i])), []);
  const remove = useCallback((id: string) => setItems((p) => p.filter((x) => x.id !== id)), []);
  const toggle = useCallback((i: CartItem) => setItems((p) => (p.some((x) => x.id === i.id) ? p.filter((x) => x.id !== i.id) : [...p, i])), []);
  const setPass = useCallback((p: PassSel | null) => setPassState(p), []);
  const setExtraBanquet = useCallback((n: number) => setPassState((p) => (p ? { ...p, extraBanquet: n } : p)), []);
  const clear = useCallback(() => { setItems([]); setPassState(null); }, []);
  const value = useMemo<Ctx>(() => {
    const passTotal = effPass ? effPass.fee + effPass.extraBanquet * effPass.banquetFee : 0;
    return {
      items, pass: effPass, held, procPct, count: items.length + (effPass ? 1 : 0), total: passTotal + items.reduce((a, b) => a + b.fee, 0),
      open, ready, has, add, remove, toggle, setPass, setExtraBanquet, clear, setOpen,
    };
  }, [items, effPass, held, procPct, open, ready, has, add, remove, toggle, setPass, setExtraBanquet, clear]);
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
