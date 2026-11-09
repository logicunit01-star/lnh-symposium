/** Server start hook: applies pending database migrations (see instrumentation-node.ts). */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { migrateOnStart } = await import("./instrumentation-node");
    await migrateOnStart();
  }
}
