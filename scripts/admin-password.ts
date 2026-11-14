// Set (or reset) a staff login's password from the server, without the password appearing on screen or in shell history.
// Usage (as the app user, in the app folder):  npm run admin:password -- admin@lnh.edu.pk
// Add --create to create a Super Admin with that email if it does not exist yet.
import fs from "node:fs";
import readline from "node:readline";

function ask(q: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    process.stdout.write(q);
    out._writeToOutput = (s: string) => { if (s.includes("\n") || s.includes("\r")) out.output.write("\n"); }; // hide typing
    rl.question("", (a) => { rl.close(); resolve(a); });
  });
}

async function main() {
  if (fs.existsSync(".env")) process.loadEnvFile(".env");
  const email = (process.argv[2] || "").trim().toLowerCase();
  const create = process.argv.includes("--create");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Usage: npm run admin:password -- <email> [--create]");
  const { db, schema: s } = await import("../src/lib/db");
  const { eq } = await import("drizzle-orm");
  const bcrypt = (await import("bcryptjs")).default;
  const [u] = await db.select({ id: s.users.id, role: s.users.role, active: s.users.active }).from(s.users).where(eq(s.users.email, email));
  if (!u && !create) throw new Error(`No login with the email ${email}. Add --create to create a Super Admin with it.`);
  const pw = await ask("New password (min 12 characters): ");
  if (pw.length < 12) throw new Error("The password must be at least 12 characters.");
  if ((await ask("Repeat the password: ")) !== pw) throw new Error("The passwords do not match.");
  const passwordHash = await bcrypt.hash(pw, 10);
  if (u) await db.update(s.users).set({ passwordHash, active: true }).where(eq(s.users.id, u.id));
  else await db.insert(s.users).values({ name: "Super Admin", email, passwordHash, role: "SUPER_ADMIN" });
  console.log(u ? `Password updated for ${email} (${u.role}).` : `Super Admin ${email} created.`);
  process.exit(0);
}
main().catch((e) => { console.error(e.message || e); process.exit(1); });
