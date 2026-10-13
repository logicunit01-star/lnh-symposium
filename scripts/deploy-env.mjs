// Used by deploy.bat: asks for the admin login and writes temporary values for `vercel env add`.
import crypto from "node:crypto";
import fs from "node:fs";
import readline from "node:readline/promises";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const email = (await rl.question("Admin email for the online site [admin@lnh.edu.pk]: ")).trim() || "admin@lnh.edu.pk";
let pass = "";
while (pass.length < 8) pass = (await rl.question("Admin password (min 8 characters, remember it!): ")).trim();
rl.close();
const vals = {
  auth: crypto.randomBytes(32).toString("hex"),
  cron: crypto.randomBytes(16).toString("hex"),
  mail: email, pass, pay: "mock",
};
for (const [k, v] of Object.entries(vals)) fs.writeFileSync(`.vtmp_${k}`, v);
