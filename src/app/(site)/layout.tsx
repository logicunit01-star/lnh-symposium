import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { FormGuard } from "@/components/ui/FormGuard";
import { Analytics } from "@/components/site/Analytics";

// GA4: GA_MEASUREMENT_ID in the server settings file, or the LNH ID on the live address only (test sites such as Vercel are not tracked)
const GA_ID = process.env.GA_MEASUREMENT_ID ?? ((process.env.APP_URL ?? "").includes("symposium2027.lnh.edu.pk") ? "G-48XJMMBKHM" : "");
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
      <FormGuard />
      <Analytics id={GA_ID} />
      <CartDrawer />
    </CartProvider>
    </div>
  );
}
