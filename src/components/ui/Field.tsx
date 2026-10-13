import { cn } from "@/lib/utils";

export function Field({ label, name, error, required, children, className, hint }: { label: string; name?: string; error?: string; required?: boolean; children: React.ReactNode; className?: string; hint?: string }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">{label}{required && <span className="text-lnh-red"> *</span>}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}
export function Alert({ kind = "error", children, className }: { kind?: "error" | "success" | "info"; children: React.ReactNode; className?: string }) {
  const c = { error: "border-lnh-red/40 bg-lnh-red/10 text-rose-200", success: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200", info: "border-lnh-sky/40 bg-lnh-sky/10 text-sky-200" }[kind];
  return <div role={kind === "error" ? "alert" : "status"} className={cn("rounded-2xl border px-5 py-4 text-sm", c, className)}>{children}</div>;
}
