// Late abstracts (15 Nov): a department that already sent Phase 1 decisions gets its portal reopened. Server stopped.
import path from "node:path";
import Module from "node:module";
import { pathToFileURL } from "node:url";
const stub = pathToFileURL(path.join(process.cwd(), "scripts/server-only-stub.cjs")).href;
(Module as any).registerHooks({ resolve: (spec: string, ctx: unknown, next: (s: string, c: unknown) => unknown) => (spec === "server-only" ? { url: stub, shortCircuit: true } : next(spec, ctx)) });
(async () => {
  const R = require("react"); if (!R.cache) R.cache = (f: any) => f; // outside Next.js
  if (require("node:fs").existsSync(".env")) process.loadEnvFile(".env");
  const { db, schema: s } = await import("../src/lib/db");
  const { sql, eq } = await import("drizzle-orm");
  const q = async (x: any) => { const r: any = await db.execute(x); return r.rows ?? r; };
  const mode = process.argv[2];
  if (mode === "close") { // Cardiology "sent" its Phase 1 decisions; one of its abstracts still undecided
    await db.execute(sql`update departments set p1_submitted_at = now() where name = 'Cardiology'`);
    console.log("undecided Cardiology:", JSON.stringify(await q(sql`select ref_no from abstracts where assigned_dept = 'Cardiology' and phase = 1 and status = 'SUBMITTED'`)));
  }
  if (mode === "submit") { // the real submit path
    await db.execute(sql`update departments set p1_submitted_at = now() where name = 'Cardiology'`);
    await db.execute(sql`update event set abstract_open = now() - interval '1 day', abstract_deadline = now() + interval '30 days' where id = 1`).catch((e: any) => console.log("window cols?", String(e.message).slice(0, 80)));
    const { submitAbstract } = await import("../src/lib/abstracts");
    const [acc] = await q(sql`select id from accounts limit 1`);
    const a = await submitAbstract({ title: "Dr.", fullName: "Late Author", designation: "Consultant", organization: "LNH", department: "Cardiology", city: "Karachi", country: "Pakistan", email: "late@example.com", mobile: "0300-1234567",
      specialty: "Cardiology", presentationPref: "ORAL", kind: "ORIGINAL", coAuthors: [], abstractTitle: `Late abstract ${Date.now()}`, keywords: ["a", "b", "c"],
      sections: { background: "Background text here.", methods: "Methods text here.", results: "Results text here.", conclusion: "Conclusion text here." } } as any, acc?.id ?? null).catch((e: any) => { console.log("submit error:", e.message); return null; });
    console.log("submitted:", (a as any)?.refNo ?? "-");
  }
  console.log("Cardiology p1_submitted_at:", JSON.stringify(await q(sql`select p1_submitted_at from departments where name = 'Cardiology'`)));
  process.exit(0);
})();
