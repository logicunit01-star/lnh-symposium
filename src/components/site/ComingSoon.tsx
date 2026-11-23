import Link from "next/link";
import { currentUser } from "@/lib/auth";

/** "Coming soon" panel for pages that are not live yet (20 Nov 2026: Agenda, Workshops, E-certificates). */
export function ComingSoon({ what, text }: { what: string; text: string }) {
  return (
    <div className="container-x pb-24">
      <div className="hud mx-auto max-w-2xl p-10 text-center">
        <p className="eyebrow justify-center">{what}</p>
        <p className="h-display mt-4 text-4xl text-white">Coming soon</p>
        <p className="mt-3 text-slate-300">{text}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/register" className="btn-primary">Register Now</Link><Link href="/" className="btn-ghost">Home</Link></div>
      </div>
    </div>
  );
}

/** Staff signed in to the admin console still see the page as it will look, with a note (for checking before switching it on). */
export async function staffPreview() { return !!(await currentUser().catch(() => null)); }
export function PreviewNote({ setting }: { setting: string }) {
  return <div className="container-x"><p className="mb-6 rounded-xl border border-lnh-gold/40 bg-lnh-gold/10 px-4 py-3 text-sm text-lnh-gold">Staff preview: the public sees “Coming soon” here until “{setting}” is ticked in Admin → Event settings.</p></div>;
}
