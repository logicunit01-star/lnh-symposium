import path from "node:path"; import Module from "node:module"; import { pathToFileURL } from "node:url";
const stub = pathToFileURL(path.join(process.cwd(), "scripts/server-only-stub.cjs")).href;
(Module as any).registerHooks({ resolve: (spec: string, ctx: unknown, next: any) => (spec === "server-only" ? { url: stub, shortCircuit: true } : next(spec, ctx)) });
const { sessionProposalInput } = await import(path.join(process.cwd(), "src/lib/programme.ts"));
const base = { department: "Cardiology", title: "T", sessionFormat: "PAPERS_ONLY", preferredSlots: [], expectedAudience: 50, chair: { name: "Dr A", phone: "03001234567", email: "a@x.com" }, coChair: { name: "", phone: "", email: "" }, moderator: { name: "Dr M", phone: "03001234567", email: "m@x.com" }, panelists: [], speakers: [], hasPresenters: false, presenters: [] };
const r = sessionProposalInput.safeParse(base); console.log("no co-chair:", r.success || JSON.stringify(r.error.issues.map((i: any) => i.path.join(".") + ": " + i.message)));
const r2 = sessionProposalInput.safeParse({ ...base, coChair: { name: "Dr C", phone: "", email: "" } }); console.log("co-chair name only:", r2.success ? "ok" : r2.error.issues.map((i: any) => i.path.join(".")).join(","));
process.exit(0);
