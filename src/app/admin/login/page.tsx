import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
export default async function Login({ searchParams }: { searchParams: { next?: string } }) {
  if (await currentUser()) redirect("/admin");
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink p-4">
      <div className="orb -left-20 top-0 h-96 w-96 bg-lnh-blue/40" />
      <div className="orb -right-20 bottom-0 h-96 w-96 bg-lnh-red/30" />
      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-lnh-navy to-lnh-blue"><svg viewBox="0 0 64 64" className="h-6 w-6"><path d="M26 10h12v16h16v12H38v16H26V38H10V26h16z" fill="#D2192E" /></svg></span>
          <div><p className="font-display font-bold text-slate-900">LNH Symposium</p><p className="text-xs text-slate-500">Staff sign-in</p></div>
        </div>
        <LoginForm next={searchParams.next} />
      </div>
    </div>
  );
}
