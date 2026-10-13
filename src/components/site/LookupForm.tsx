"use client";
import { useRouter } from "next/navigation";
import { useSubmit } from "@/components/ui/useForm";
import { Field, Alert } from "@/components/ui/Field";

export function LookupForm({ endpoint, mode, cta }: { endpoint: string; mode: "status" | "certificate"; cta: string }) {
  const router = useRouter();
  const { submit, loading, error } = useSubmit<any>(endpoint);
  return (
    <form className="space-y-5" onSubmit={async (e) => {
      e.preventDefault();
      const r = await submit(Object.fromEntries(new FormData(e.currentTarget)));
      if (!r) return;
      if (mode === "status") router.push(`/register/success/${r.accessToken}`); else window.location.href = r.url;
    }}>
      {error && <Alert>{error}</Alert>}
      <Field label="Registration no." name="regNo" required><input id="regNo" name="regNo" className="input uppercase" placeholder="LNH27-0001" required /></Field>
      <Field label="Email used to register" name="email" required><input id="email" name="email" type="email" className="input" required /></Field>
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Checking…" : cta}</button>
    </form>
  );
}
