import { redirect } from "next/navigation";
import { currentAccountClaims } from "@/lib/account";
import { NeuralField } from "@/components/ui/NeuralField";
import { AccountForms } from "./AccountForms";
import { CartPanel } from "@/components/cart/CartPanel";

export const metadata = { title: "Sign in or create account" };

export default async function Account({ searchParams }: { searchParams: { next?: string; mode?: string } }) {
  const next = searchParams.next?.startsWith("/") ? searchParams.next : "/account/bookings";
  if (await currentAccountClaims()) redirect(next);
  return (
    <section className="noise relative overflow-hidden pb-10 pt-40">
      <div className="circuit absolute inset-0 opacity-70" />
      <NeuralField density={0.5} />
      <div className="container-x relative grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <span className="eyebrow">Account provisioning &amp; professional profile</span>
          <h1 className="h-display mt-4 text-4xl text-white sm:text-5xl">{next === "/checkout" ? "Sign in to check out" : "Your symposium account"}</h1>
          <p className="mt-3 max-w-xl text-slate-300">One account for registration, workshops and abstract submission. Returning participants simply sign in.</p>
          <div className="mt-8"><AccountForms next={next} initialMode={searchParams.mode === "signup" ? "signup" : "signin"} /></div>
        </div>
        <aside className="lg:col-span-4 lg:pt-24"><div className="lg:sticky lg:top-28"><CartPanel /></div></aside>
      </div>
    </section>
  );
}
