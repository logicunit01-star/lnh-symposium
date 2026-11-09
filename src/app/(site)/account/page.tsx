import Link from "next/link";
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
          <span className="eyebrow">Your symposium account</span>
          <h1 className="h-display mt-4 text-4xl text-white sm:text-5xl">{next.startsWith("/checkout") ? "Sign in to check out" : "Sign in"}</h1>
          <p className="mt-3 max-w-xl text-slate-300">{next.startsWith("/checkout") ? "Your selection is kept while you sign in or create an account." : "One account for your Symposium Pass, workshop tickets and abstracts."}</p>
          <div className="mt-8"><AccountForms next={next} initialMode={searchParams.mode === "signup" ? "signup" : "signin"} /></div>
          <p className="mt-4 text-sm text-slate-300">Registered at the desk, as a guest or volunteer, or without an account? <Link href="/my-registrations" className="text-lnh-sky underline">Find your tickets with a code</Link>.</p>
        </div>
        <aside className="lg:col-span-4 lg:pt-24"><div className="lg:sticky lg:top-28"><CartPanel /></div></aside>
      </div>
    </section>
  );
}
