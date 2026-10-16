import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { getEvent } from "@/lib/event";
import { currentAccountClaims } from "@/lib/account";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [ev, account] = await Promise.all([getEvent(), currentAccountClaims()]);
  return (
    <CartProvider>
      <Nav year={new Date(ev.startDate).getFullYear()} account={account ? { name: account.name } : null} />
      <main className="min-h-screen">{children}</main>
      <Footer ev={ev} />
      <CartDrawer />
    </CartProvider>
  );
}
