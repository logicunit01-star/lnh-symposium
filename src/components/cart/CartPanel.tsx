"use client";
import { OrderSummary } from "./CartDrawer";

export function CartPanel() {
  return (
    <div className="hud p-5">
      <p className="eyebrow mb-4">Your order</p>
      <OrderSummary />
    </div>
  );
}
