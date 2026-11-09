import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { getEvent } from "@/lib/event";
import { currentAccountClaims } from "@/lib/account";
import { delegateStatus } from "@/lib/registration";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [ev, account] = await Promise.all([getEvent(), currentAccountClaims()]);
  const st = account ? await delegateStatus(account.sub).catch(() => null) : null;
  const held = st?.pass ? { regNo: st.pass.regNo, status: st.pass.paymentStatus, accessToken: st.pass.accessToken, designation: st.pass.designation, categoryId: st.pass.categoryId } : null;
  return (
    <div className="site">
    <CartProvider held={held} procPct={ev.processingFeePct}>
      <Nav year={new Date(ev.startDate).getFullYear()} account={account ? { name: account.name, hasPass: !!held } : null} />
      <main className="min-h-screen">{children}</main>
      <Footer ev={ev} />
      <CartDrawer />
    </CartProvider>
    </div>
  );
}
