"use client";
import { CartSummary } from "./CartDrawer";

export function CartPanel() {
  return (
    <div className="hud p-5">
      <p className="eyebrow mb-4">Your registration cart</p>
      <CartSummary />
    </div>
  );
}
